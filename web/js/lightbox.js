/**
 * ==========================================================================
 * LIGHTBOX.JS — QUẢN LÝ MODAL PHÓNG TO ẢNH MINH HOẠ
 * ==========================================================================
 */
(function (window) {
  let imgLightbox;
  let lbImg;
  let lbCaption;

  /**
   * Mở modal phóng to ảnh
   * @param {string} src - Đường dẫn hình ảnh
   * @param {string} caption - Chú thích ảnh
   */
  function openLightbox(src, caption) {
    if (!imgLightbox || !lbImg) return;
    lbImg.src = src;
    lbImg.alt = caption || '';
    if (lbCaption) {
      lbCaption.textContent = caption || '';
    }
    imgLightbox.classList.add('open');

    if (window.HermexAudio && typeof window.HermexAudio.playLightboxSound === 'function') {
      window.HermexAudio.playLightboxSound(true);
    }
  }

  /**
   * Đóng modal phóng to ảnh
   */
  function closeLightbox() {
    if (!imgLightbox || !lbImg || !imgLightbox.classList.contains('open')) return;
    imgLightbox.classList.remove('open');
    lbImg.src = '';

    if (window.HermexAudio && typeof window.HermexAudio.playLightboxSound === 'function') {
      window.HermexAudio.playLightboxSound(false);
    }
  }

  /**
   * Khởi tạo các sự kiện click cho Lightbox
   */
  function initLightbox() {
    imgLightbox = document.getElementById('imgLightbox');
    lbImg = document.getElementById('lbImg');
    lbCaption = document.getElementById('lbCaption');
    const lbClose = document.getElementById('lbClose');

    // Gắn sự kiện click cho các khung ảnh có thuộc tính data-lightbox="true"
    document.querySelectorAll('.xor-frame[data-lightbox="true"]').forEach((frame) => {
      frame.addEventListener('click', () => {
        const img = frame.querySelector('img');
        if (img) {
          openLightbox(img.src, frame.getAttribute('data-caption'));
        }
      });
    });

    // Nút đóng modal
    if (lbClose) {
      lbClose.addEventListener('click', closeLightbox);
    }

    // Click vào vùng mờ bên ngoài ảnh để đóng
    if (imgLightbox) {
      imgLightbox.addEventListener('click', (e) => {
        if (e.target === imgLightbox) {
          closeLightbox();
        }
      });
    }

    // Nhấn phím Escape để đóng
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && imgLightbox && imgLightbox.classList.contains('open')) {
        closeLightbox();
      }
    });
  }

  window.initLightbox = initLightbox;
  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;
})(window);
