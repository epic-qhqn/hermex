/**
 * ==========================================================================
 * CONTROLS.JS — QUẢN LÝ NÚT ĐIỀU KHIỂN (TRÌNH CHIẾU & ÂM THANH)
 * ==========================================================================
 */
(function (window) {
  /**
   * Khởi tạo các nút chức năng trên thanh top bar
   */
  function initControls() {
    const presentBtn = document.getElementById('presentBtn');
    const soundBtn = document.getElementById('soundBtn');

    // Chế độ trình chiếu Fullscreen
    if (presentBtn) {
      presentBtn.addEventListener('click', function () {
        if (window.HermexAudio && typeof window.HermexAudio.playClickSound === 'function') {
          window.HermexAudio.playClickSound();
        }

        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          this.classList.add('active');
          this.textContent = 'Thoát trình chiếu';
        } else {
          document.exitFullscreen().catch(() => {});
          this.classList.remove('active');
          this.textContent = 'Trình chiếu';
        }
      });

      // Cập nhật trạng thái nút khi người dùng thoát fullscreen bằng phím Esc của trình duyệt
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          presentBtn.classList.remove('active');
          presentBtn.textContent = 'Trình chiếu';
        }
      });
    }

    // Bật/tắt âm thanh
    if (soundBtn) {
      // Đồng bộ trạng thái ban đầu
      const initialAudioState = window.HermexAudio ? window.HermexAudio.isSoundEnabled() : true;
      soundBtn.classList.toggle('active', initialAudioState);
      soundBtn.textContent = 'Âm thanh: ' + (initialAudioState ? 'Bật' : 'Tắt');

      soundBtn.addEventListener('click', function () {
        const currentlyEnabled = window.HermexAudio ? window.HermexAudio.isSoundEnabled() : true;
        const newEnabledState = !currentlyEnabled;

        if (window.HermexAudio && typeof window.HermexAudio.setSoundEnabled === 'function') {
          window.HermexAudio.setSoundEnabled(newEnabledState);
        }

        this.classList.toggle('active', newEnabledState);
        this.textContent = 'Âm thanh: ' + (newEnabledState ? 'Bật' : 'Tắt');
      });
    }
  }

  window.initControls = initControls;
})(window);
