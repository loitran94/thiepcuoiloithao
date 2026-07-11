const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const https = require('https');

const app = express();
const GOOGLE_SHEETS_WEBHOOK =
  process.env.GOOGLE_SHEETS_WEBHOOK ||
  'https://script.google.com/macros/s/AKfycbwN9CFCMyFD2GloW0c_XDhkcMxw_OnknCrqFkEdn7akps59P4qDx_Ez71wkeTLu9GaF_A/exec';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Dòng này giúp Vercel đọc được các file index.html, css, js của bạn

// THÊM ĐOẠN NÀY: Định tuyến cho trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
});

// Bỏ đoạn tạo folder fs.mkdirSync vì Vercel không cho phép ghi dữ liệu ổ đĩa

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
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

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

    // LƯU Ý: Đã bỏ đoạn ghi file rsvp.json cục bộ để tránh lỗi Hệ thống file Read-only trên Vercel.
    // Dữ liệu bây giờ sẽ phụ thuộc hoàn toàn vào Google Sheets của bạn.

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
        response.on('data', (chunk) => { responseBody += chunk; });
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
        return res.json([]); // Trả về mảng rỗng nếu không lấy được từ Google Sheets
      })
      .catch((error) => {
        console.error('Google Sheets read failed:', error);
        res.json([]);
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
        response.on('data', (chunk) => { responseBody += chunk; });
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
  if (!payload) return null;
  let data = payload;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed || trimmed.startsWith('<')) return null;
    try { data = JSON.parse(trimmed); } catch (e) { return null; }
  }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.rsvpList)) return data.rsvpList;
  if (data && Array.isArray(data.wishes)) return data.wishes;
  if (data && Array.isArray(data.items)) return data.items;
  return null;
}

// Chỉ chạy app.listen khi test ở máy cá nhân (Local)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🎉 Wedding server running at http://localhost:${PORT}`);
  });
}

// QUAN TRỌNG: Xuất cấu hình app để Vercel Serverless có thể chạy được
module.exports = app;