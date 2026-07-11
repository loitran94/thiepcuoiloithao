/* ==========================================================================
   1. KHỞI TẠO THƯ VIỆN HIỆU ỨNG (AOS & SWIPER)
   ========================================================================== */
AOS.init({
  duration: 1200,
  once: true,
});

const swiper = new Swiper(".mySwiper", {
  loop: true,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  speed: 1000,
});

/* ==========================================================================
   2. HIỆU ỨNG HOA ĐÀO RƠI (FALLING FLOWERS)
   ========================================================================== */
function createFlower() {
  const container = document.getElementById("flowers");
  if (!container) return;

  const flower = document.createElement("div");
  flower.className = "flower";
  flower.textContent = "🌸";
  
  flower.style.left = `${Math.random() * 100}vw`;
  
  const fallDuration = 7 + Math.random() * 7;
  const shakeDuration = 3 + Math.random() * 3;
  
  flower.style.animationDuration = `${fallDuration}s, ${shakeDuration}s`;
  flower.style.animationTimingFunction = "linear, ease-in-out";
  flower.style.fontSize = `${14 + Math.random() * 20}px`;
  flower.style.opacity = 0.4 + Math.random() * 0.6;
  
  container.appendChild(flower);
  
  setTimeout(() => {
    flower.remove();
  }, fallDuration * 1000);
}

// Tạo hoa rơi tuần hoàn mỗi 1.85 giây
setInterval(createFlower, 1850);

/* ==========================================================================
   3. BỘ ĐẾM NGƯỢC THỜI GIAN (COUNTDOWN)
   ========================================================================== */
const weddingDate = new Date("August 09, 2026 11:00:00").getTime();

function updateCountdown() {
  const now = Date.now();
  const distance = weddingDate - now;

  const days = Math.max(0, Math.floor(distance / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
  const seconds = Math.max(0, Math.floor((distance % (1000 * 60)) / 1000));

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");

  if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
  if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
  if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ==========================================================================
   4. KÍCH HOẠT MỞ CÁNH THIỆP & PHÁT NHẠC (OPEN INVITATION)
   ========================================================================== */
const seal = document.getElementById("seal");
const introCard = document.getElementById("introCard");
const openingScreen = document.getElementById("openingScreen");
const bgMusic = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicToggle");

let isPlaying = false;

if (seal) {
  seal.addEventListener("click", () => {
    // 1. Kích hoạt hiệu ứng mở hai cánh cửa và ẩn con dấu
    if (introCard) introCard.classList.add("open");

    // 2. Phát nhạc nền từ thẻ audio
    if (bgMusic) {
      bgMusic.play()
        .then(() => {
          isPlaying = true;
          if (musicBtn) musicBtn.textContent = "🔊";
        })
        .catch(err => console.log("Trình duyệt chặn tự động phát nhạc:", err));
    }

    // 3. Làm mờ dần màn hình chào sau khi cánh thiệp mở ra hẳn
    setTimeout(() => {
      if (openingScreen) {
        openingScreen.style.transition = "opacity 1.5s ease, visibility 1.5s ease";
        openingScreen.style.opacity = "0";
        openingScreen.style.visibility = "hidden";

        // Xóa hẳn block khỏi DOM để giải phóng tài nguyên
        setTimeout(() => {
          openingScreen.remove();
        }, 1500);
      }
      
      // Bắt đầu cuộn màn hình mượt nhẹ tạo sự chú ý
      startAutoScroll();
    }, 2200); 
  });
}

// Bật/Tắt Nhạc Floating Button
if (musicBtn) {
  musicBtn.addEventListener("click", () => {
    if (!bgMusic) return;
    if (isPlaying) {
      bgMusic.pause();
      musicBtn.textContent = "🔇";
    } else {
      bgMusic.play().catch(() => {});
      musicBtn.textContent = "🔊";
    }
    isPlaying = !isPlaying;
  });
}

/* ==========================================================================
   5. XỬ LÝ SỰ KIỆN KHỐI RSVP & ĐỒNG BỘ GOOGLE SHEETS
   ========================================================================== */
const rsvpForm = document.getElementById('rsvpForm');

// ⚠️ ĐƯỜNG DẪN WEB APP GOOGLE SCRIPT CỦA BẠN (Thay bằng link /exec của bạn)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_jNYOpgaMajrvKw-VIUY8UmIb6TDHRdKM25h-mf7Ny-mBPhN_DEGO0FwYbz761UAMtA/exec';

if (rsvpForm) {
  rsvpForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const submitButton = this.querySelector('button[type="submit"]');
    const msg = document.getElementById('rsvpMessage');

    // --- KIỂM TRA CHỐNG SPAM (LOCALSTORAGE) ---
    const lastSubmit = localStorage.getItem('lastRsvpTime');
    const nowTime = Date.now();
    const cooldownTime = 3 * 60 * 1000; // 3 phút (tính bằng mili-giây)

    if (lastSubmit && (nowTime - lastSubmit < cooldownTime)) {
      const timeLeft = Math.ceil((cooldownTime - (nowTime - lastSubmit)) / 1000 / 60);
      alert(`⚠️ Bạn vừa gửi xác nhận xong. Vui lòng đợi ${timeLeft} phút nữa nếu muốn gửi thêm nhé!`);
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = 'ĐANG GỬI...';
    }

    // Thu thập dữ liệu từ Form
    const data = {
      name: document.getElementById('rsvpName').value,
      quantity: document.getElementById('rsvpQuantity').value,
      attendance: document.querySelector('input[name="attendance"]:checked').value,
      wish: document.getElementById('rsvpWish').value
    };

    // Gửi dữ liệu lên Google Sheets
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(() => {
      // --- LƯU TRẠNG THÁI ĐÃ GỬI ĐỂ CHẶN SPAM ---
      localStorage.setItem('lastRsvpTime', Date.now());

      if (msg) {
        msg.innerHTML = '💖 Cảm ơn bạn đã xác nhận tham dự! Lời chúc đã được lưu lại.';
        msg.style.display = 'block';
        msg.style.color = '#7b5d3b';
        msg.style.background = '#ffecd1';
        
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
      }

      rsvpForm.reset();
      
      // Đợi 1 giây rồi tải lại danh sách lời chúc mới
      setTimeout(loadWishes, 1000);
    })
    .catch(err => {
      console.error('Lỗi khi gửi RSVP:', err);
      alert('Có lỗi xảy ra, vui lòng thử lại sau.');
    })
    .finally(() => {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = 'GỬI XÁC NHẬN';
      }
    });
  });
}

// Hàm tải lời chúc từ Google Sheets về hiển thị lên website
async function loadWishes() {
  const container = document.getElementById('wishesContainer');
  if (!container) return;

  try {
    // Gọi hàm doGet của Google Script để lấy mảng lời chúc
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const wishes = await response.json();

    container.innerHTML = '';

    if (!wishes || !wishes.length || wishes.error) {
      container.innerHTML = '<p style="text-align:center; color:#888;">Chưa có lời chúc nào. Hãy là người đầu tiên gửi chúc phúc!</p>';
      return;
    }

    // Hàm mã hóa ký tự lạ tránh lỗi bảo mật hiển thị HTML (XSS)
    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Đảo ngược danh sách (Lời chúc mới nhất xếp lên đầu)
    wishes.reverse().forEach(item => {
      container.innerHTML += `
        <div class="wish-card">
          <div class="wish-header">
            <div class="wish-name">${escapeHtml(item.name)}</div>
            <div class="wish-time">${escapeHtml(item.timestamp)}</div>
          </div>
          <div class="wish-text">${escapeHtml(item.wish)}</div>
        </div>
      `;
    });
  } catch (error) {
    console.log("Không thể tải sổ lưu bút từ Google Sheets:", error);
    container.innerHTML = '<p style="text-align:center; color:#888;">Cảm ơn bạn đã gửi lời chúc phúc đến Lợi Trần & Thao Phạm!</p>';
  }
}

// Tự động load lời chúc ngay khi vừa tải xong trang
document.addEventListener("DOMContentLoaded", () => {
  loadWishes();
});

/* ==========================================================================
   6. POPUP QUÀ MỪNG CƯỚI (MỌI POPUP CHỨC NĂNG)
   ========================================================================== */
const openQrBtn = document.getElementById("openQrBtn");
const closeQrBtn = document.getElementById("closeQrBtn");
const qrPopup = document.getElementById("qrPopup");
const qrImage = document.getElementById("qrImage");
const downloadQrBtn = document.getElementById("downloadQrBtn");

if (openQrBtn && qrPopup) {
  openQrBtn.addEventListener("click", () => {
    qrPopup.style.display = "flex";
  });
}

if (closeQrBtn && qrPopup) {
  closeQrBtn.addEventListener("click", () => {
    qrPopup.style.display = "none";
  });
}

if (downloadQrBtn && qrImage) {
  downloadQrBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = qrImage.src;
    link.download = "qr-mung-cuoi-loi-thao.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

window.addEventListener("click", (event) => {
  if (event.target === qrPopup) {
    qrPopup.style.display = "none";
  }
});

/* ==========================================================================
   7. CUỘN MÀN HÌNH TỰ ĐỘNG KHỞI ĐẦU (SMOOTH AUTO SCROLL)
   ========================================================================== */
function startAutoScroll() {
  let isAutoScrolling = true;
  const speed = 0.7;

  function smoothScroll() {
    if (!isAutoScrolling) return;

    window.scrollBy(0, speed);

    const bottomReached = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 5);
    if (!bottomReached) {
      requestAnimationFrame(smoothScroll);
    }
  }

  requestAnimationFrame(smoothScroll);

  // Người dùng tương tác (cuộn/chạm) thì dừng tính năng tự cuộn lập tức
  const stopScroll = () => {
    isAutoScrolling = false;
    window.removeEventListener("touchstart", stopScroll);
    window.removeEventListener("wheel", stopScroll);
    window.removeEventListener("scroll", stopScroll);
  };

  window.addEventListener("touchstart", stopScroll, { passive: true });
  window.addEventListener("wheel", stopScroll, { passive: true });
}

/* ==========================================================================
   8. CHỨC NĂNG SAO CHÉP ĐƯỜNG DẪN CHIA SẺ (SHARE LINK)
   ========================================================================== */
const shareLinkBtn = document.getElementById('shareLinkBtn');
if (shareLinkBtn) {
  shareLinkBtn.addEventListener('click', () => {
    const invitationUrl = window.location.href;
    navigator.clipboard.writeText(invitationUrl).then(() => {
      shareLinkBtn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-text">Đã sao chép!</span>';
      shareLinkBtn.style.background = '#6ba86d';
      
      setTimeout(() => {
        shareLinkBtn.innerHTML = '<span class="btn-icon">🔗</span><span class="btn-text">Chia Sẻ</span>';
        shareLinkBtn.style.background = '#b38b59';
      }, 2500);
    }).catch(() => {
      alert('❌ Không thể sao chép liên kết.');
    });
  });
}
/* ==========================================================================
   9. XỬ LÝ CLICK NỔI BẬT THẺ LỊCH TRÌNH NGÀY CƯỚI
   ========================================================================== */
document.querySelectorAll('.timeline-card').forEach(card => {
  card.addEventListener('click', function() {
    // Nếu thẻ này đang active thì bỏ active, ngược lại thì kích hoạt
    if (this.classList.contains('active')) {
      this.classList.remove('active');
    } else {
      // Xóa active của các thẻ khác trước khi kích hoạt thẻ được chọn
      document.querySelectorAll('.timeline-card').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    }
  });
});