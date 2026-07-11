const express = require('express');
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

// Ép server đọc toàn bộ file tĩnh (html, css, js, images, music) ở thư mục gốc
app.use(express.static(__dirname));
app.use('/music', express.static(path.join(__dirname, 'music')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Định tuyến hiển thị giao diện trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API SAVE RSVP DATA (Gửi dữ liệu đi)
app.post('/api/rsvp', async (req, res) => {
  try {
    const { name, quantity, wish } = req.body;
    if (!name || !quantity) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên và số lượng' });
    }

    const rsvpData = {
      id: Date.now(),
      name: name.trim(),
      quantity: parseInt(quantity, 10) || 1,
      wish: (wish || '').trim() || 'Không có lời chúc',
      timestamp: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };

    let googleSheetsSynced = false;
    try {
      googleSheetsSynced = await syncRsvpToGoogleSheets(rsvpData);
    } catch (syncError) {
      console.error('Google Sheets sync failed:', syncError);
    }

    res.json({ success: true, message: 'Cảm ơn bạn đã xác nhận tham dự!', data: rsvpData, googleSheetsSynced });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lưu dữ liệu' });
  }
});

function syncRsvpToGoogleSheets(rsvpData) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(rsvpData);
    const requestUrl = new URL(GOOGLE_SHEETS_WEBHOOK);
    const request = https.request({
        method: 'POST',
        hostname: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      }, (response) => {
        resolve(response.statusCode >= 200 && response.statusCode < 300);
      }
    );
    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });
}

// API GET ALL RSVP DATA (Lấy dữ liệu về)
app.get('/api/rsvp', (req, res) => {
  fetchRsvpFromGoogleSheets()
    .then((remoteList) => res.json(remoteList || []))
    .catch(() => res.json([]));
});

function fetchRsvpFromGoogleSheets() {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(GOOGLE_SHEETS_WEBHOOK);
    const request = https.request({
        method: 'GET',
        hostname: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.8' }
      }, (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { responseBody += chunk; });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) return resolve(null);
          try {
            const data = JSON.parse(responseBody.trim());
            resolve(Array.isArray(data) ? data : data.data || data.rsvpList || null);
          } catch (e) { resolve(null); }
        });
      }
    );
    request.on('error', reject);
    request.end();
  });
}

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🎉 Running at http://localhost:${PORT}`));
}

module.exports = app;