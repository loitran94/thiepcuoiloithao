const express = require('express');
const cors = require('cors');

const app = express();
const GOOGLE_SHEETS_WEBHOOK =
  process.env.GOOGLE_SHEETS_WEBHOOK ||
  'https://script.google.com/macros/s/AKfycbwN9CFCMyFD2GloW0c_XDhkcMxw_OnknCrqFkEdn7akps59P4qDx_Ez71wkeTLu9GaF_A/exec';

// Middleware
app.use(cors());
app.use(express.json());

// API GỬI RSVP DATA (Đồng bộ chuẩn với fetch('/api/rsvp') ở Frontend)
app.post('/api/rsvp', async (req, res) => {
  try {
    const { name, quantity, wish, attendance } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Vui lòng nhập họ tên' });
    }

    const rsvpData = {
      id: Date.now(),
      name: name.trim(),
      quantity: parseInt(quantity, 10) || 1,
      attendance: attendance || 'Có',
      wish: (wish || '').trim() || 'Không có lời chúc',
      timestamp: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };

    // Dùng fetch tự động xử lý redirect 302 từ Google Script cực mượt
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });

    res.json({ success: true, message: 'Cảm ơn bạn đã xác nhận tham dự!' });
  } catch (error) {
    console.error('Google Sheets sync failed:', error);
    res.status(500).json({ error: 'Lỗi khi lưu dữ liệu' });
  }
});

// API LẤY DANH SÁCH LỜI CHÚC (Đồng bộ chuẩn với fetch('/api/wishes') ở Frontend)
app.get('/api/wishes', async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK);
    const data = await response.json();
    
    // Trả về mảng dữ liệu chuẩn cho client
    const wishesList = Array.isArray(data) ? data : (data.data || data.rsvpList || []);
    res.json(wishesList);
  } catch (error) {
    console.error('Lỗi lấy danh sách wishes:', error);
    res.json([]); // Trả về mảng rỗng nếu lỗi để giao diện không bị sập
  }
});

// Chạy local thử nghiệm nếu cần
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🎉 Running at http://localhost:${PORT}`));
}

module.exports = app;