/**
 * FIT.JS — co nội dung từng slide cho vừa khung hình
 * Slide nào cao hơn màn hình sẽ được thu nhỏ vừa đủ (không dưới 68%),
 * thay cho việc nội dung bị cắt và phải cuộn ẩn.
 */
(function (window) {
  var MIN_ZOOM = 0.68;

  function fitSlide(slide) {
    slide.style.zoom = '';
    if (window.innerWidth < 900) return; // màn hình hẹp: cuộn thay vì thu nhỏ chữ
    var ch = slide.clientHeight;
    var sh = slide.scrollHeight;
    if (!ch || sh <= ch + 2) return;
    var z = Math.max(MIN_ZOOM, (ch / sh) * 0.985);
    slide.style.zoom = z.toFixed(3);
  }

  function fitAll() {
    var slides = document.querySelectorAll('.slide');
    for (var i = 0; i < slides.length; i++) fitSlide(slides[i]);
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(fitAll, 120);
  }

  window.hermexFitAll = fitAll;
  window.hermexFitSlide = fitSlide;
  window.addEventListener('resize', schedule);
  window.addEventListener('load', fitAll);
  document.addEventListener('DOMContentLoaded', fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  document.addEventListener('hermex:slide', function (e) {
    var s = document.querySelectorAll('.slide')[e.detail.index];
    if (s) fitSlide(s);
  });
})(window);
