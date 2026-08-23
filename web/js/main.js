/**
 * ==========================================================================
 * MAIN.JS — ENTRY POINT KHỞI TẠO TOÀN BỘ ỨNG DỤNG HERMEX WEB
 * ==========================================================================
 */

function startApp() {
  if (typeof window.initDeck === 'function') {
    window.initDeck();
  }
  if (typeof window.initControls === 'function') {
    window.initControls();
  }
  if (typeof window.initLightbox === 'function') {
    window.initLightbox();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
