const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 3000;
const GOOGLE_SHEETS_WEBHOOK =
  process.env.GOOGLE_SHEETS_WEBHOOK ||
  'https://script.google.com/macros/s/AKfycbwN9CFCMyFD2GloW0c_XDhkcMxw_OnknCrqFkEdn7akps59P4qDx_Ez71wkeTLu9GaF_A/exec';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Create data folder if it doesn't exist
const dataFolder = path.join(__dirname, 'data');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
}

// SAVE RSVP DATA
app.post('/api/rsvp', async (req, res) => {
  try {
    const { name, quantity, wish } = req.body;

    // Validate input
    if (!name || !quantity) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên và số lượng' });
    }

    const trimmedName = name.trim();
    const trimmedWish = (wish || '').trim() || 'Không có lời chúc';
    const parsedQuantity = parseInt(quantity, 10);
    const timestamp = new Date().toLocaleString('vi-VN');

    // Create RSVP object
    const rsvpData = {
      id: Date.now(),
      name: trimmedName,
      quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 1,
      wish: trimmedWish,
      timestamp
    };

    let googleSheetsSynced = false;

    try {
      googleSheetsSynced = await syncRsvpToGoogleSheets(rsvpData);
    } catch (syncError) {
      console.error('Google Sheets sync failed:', syncError);
    }

    // Save to JSON file
    const dataFile = path.join(dataFolder, 'rsvp.json');
    let existingData = [];

    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf-8');
      existingData = JSON.parse(content);
    }

    existingData.push(rsvpData);
    fs.writeFileSync(dataFile, JSON.stringify(existingData, null, 2));

    res.json({ 
      success: true, 
      message: 'Cảm ơn bạn đã xác nhận tham dự!',
      data: rsvpData,
      googleSheetsSynced
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Lỗi khi lưu dữ liệu' });
  }
});

function syncRsvpToGoogleSheets(rsvpData) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(rsvpData);
    const requestUrl = new URL(GOOGLE_SHEETS_WEBHOOK);

    const request = https.request(
      {
        method: 'POST',
        hostname: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(true);
            return;
          }

          resolve(false);
        });
      }
    );

    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });
}

// GET ALL RSVP DATA
app.get('/api/rsvp', (req, res) => {
  try {
    fetchRsvpFromGoogleSheets()
      .then((remoteList) => {
        if (remoteList) {
          return res.json(remoteList);
        }

        return res.json(readLocalRsvpData());
      })
      .catch((error) => {
        console.error('Google Sheets read failed:', error);
        res.json(readLocalRsvpData());
      });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy dữ liệu' });
  }
});

function fetchRsvpFromGoogleSheets() {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(GOOGLE_SHEETS_WEBHOOK);

    const request = https.request(
      {
        method: 'GET',
        hostname: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: {
          Accept: 'application/json, text/plain;q=0.9, */*;q=0.8'
        }
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            resolve(null);
            return;
          }

          const parsedList = normalizeRsvpList(responseBody);
          resolve(parsedList);
        });
      }
    );

    request.on('error', reject);
    request.end();
  });
}

function normalizeRsvpList(payload) {
  if (!payload) {
    return null;
  }

  let data = payload;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();

    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('<')) {
      return null;
    }

    try {
      data = JSON.parse(trimmed);
    } catch (parseError) {
      return null;
    }
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  if (data && Array.isArray(data.rsvpList)) {
    return data.rsvpList;
  }

  if (data && Array.isArray(data.wishes)) {
    return data.wishes;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return null;
}

function readRsvpData() {
  return readLocalRsvpData();
}

function readLocalRsvpData() {
  const dataFile = path.join(dataFolder, 'rsvp.json');
  if (!fs.existsSync(dataFile)) {
    return [];
  }

  const content = fs.readFileSync(dataFile, 'utf-8');
  return JSON.parse(content);
}

function escapeCsv(value) {
  const text = String(value || '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function buildCsv(data) {
  const headers = ['ID', 'Tên', 'Số lượng', 'Lời chúc', 'Thời gian'];
  const rows = data.map(item => [
    item.id,
    escapeCsv(item.name),
    item.quantity,
    escapeCsv(item.wish),
    escapeCsv(item.timestamp)
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function buildXls(data) {
  const rows = data.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.wish}</td>
      <td>${item.timestamp}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body>
  <table border="1">
    <thead>
      <tr>
        <th>ID</th>
        <th>Tên</th>
        <th>Số lượng</th>
        <th>Lời chúc</th>
        <th>Thời gian</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

// EXPORT RSVP DATA AS CSV OR XLS
app.get('/api/rsvp/export', (req, res) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const data = readRsvpData();

    if (!data.length) {
      return res.status(404).json({ error: 'Chưa có dữ liệu RSVP để xuất.' });
    }

    let fileName;
    let fileContent;
    let contentType;

    if (format === 'xls') {
      fileName = 'rsvp_export.xls';
      fileContent = buildXls(data);
      contentType = 'application/vnd.ms-excel';
    } else {
      fileName = 'rsvp_export.csv';
      fileContent = buildCsv(data);
      contentType = 'text/csv; charset=utf-8';
    }

    const filePath = path.join(dataFolder, fileName);
    fs.writeFileSync(filePath, fileContent, 'utf-8');

    res.json({
      success: true,
      message: `Đã xuất dữ liệu thành công sang ${fileName}`,
      file: `/data/${fileName}`
    });
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ error: 'Lỗi khi xuất dữ liệu' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎉 Wedding server running at http://localhost:${PORT}`);
  console.log(`📁 RSVP data will be saved to: ${dataFolder}`);
});
