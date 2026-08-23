/**
 * ==========================================================================
 * DECK.JS — QUẢN LÝ SLIDE DECK & TIẾN TRÌNH TRÌNH CHIẾU
 * Tích hợp âm thanh tương tác và hiệu ứng chuyển slide cao cấp
 * ==========================================================================
 */
(function (window) {
  let current = 0;
  let slides = [];

  /**
   * Khởi tạo danh sách slide và hiển thị slide đầu tiên
   */
  function initDeck() {
    slides = Array.from(document.querySelectorAll('.slide'));
    if (slides.length === 0) return;

    goTo(0, false); // Không phát âm thanh ở lần tải trang đầu tiên

    // Bắt sự kiện click nút điều hướng
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (window.HermexAudio && typeof window.HermexAudio.playClickSound === 'function') {
          window.HermexAudio.playClickSound();
        }
        goTo(current + 1);
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (window.HermexAudio && typeof window.HermexAudio.playClickSound === 'function') {
          window.HermexAudio.playClickSound();
        }
        goTo(current - 1);
      });
    }

    // Bắt sự kiện bàn phím (Phím mũi tên, Space)
    document.addEventListener('keydown', (e) => {
      // Không chuyển slide nếu đang mở modal lightbox
      const lightbox = document.getElementById('imgLightbox');
      if (lightbox && lightbox.classList.contains('open')) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goTo(current + 1);
      }
      if (e.key === 'ArrowLeft') {
        goTo(current - 1);
      }
    });
  }

  /**
   * Chuyển tới slide chỉ định
   * @param {number} i - Chỉ số slide mục tiêu (0-indexed)
   * @param {boolean} [playSound=true] - Có phát âm thanh chuyển slide hay không
   */
  function goTo(i, playSound = true) {
    if (i < 0 || i >= slides.length || (i === current && slides[current].classList.contains('active'))) return;

    if (slides[current]) {
      slides[current].classList.remove('active');
    }

    current = i;
    slides[current].classList.add('active');

    // Phát âm thanh chuyển slide
    if (playSound && window.HermexAudio && typeof window.HermexAudio.playSlideSound === 'function') {
      window.HermexAudio.playSlideSound();
    }

    // Cập nhật số thứ tự slide (vd: SLIDE 01 / 24)
    const slideCountEl = document.getElementById('slideCount');
    if (slideCountEl) {
      slideCountEl.textContent =
        'SLIDE ' + String(current + 1).padStart(2, '0') + ' / ' + slides.length;
    }

    // Cập nhật thanh tiến trình photon
    const progressFillEl = document.getElementById('progressFill');
    if (progressFillEl) {
      progressFillEl.style.width =
        ((current + 1) / slides.length * 100) + '%';
    }

    // Cập nhật tên đề mục (section hint)
    const hint = slides[current].getAttribute('data-section') || '';
    const sectionHintEl = document.getElementById('sectionHint');
    if (sectionHintEl) {
      sectionHintEl.textContent = hint;
    }
  }

  // Xuất ra phạm vi toàn cục
  window.initDeck = initDeck;
  window.goTo = goTo;
  window.getCurrentSlide = () => current;
  window.getTotalSlides = () => slides.length;
})(window);
