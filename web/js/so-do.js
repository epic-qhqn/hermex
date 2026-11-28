/* Sơ đồ hàn: xem từng vùng phóng to. Phím mũi tên hoặc bút trình chiếu đi qua từng vùng rồi mới sang slide. */
(function () {
  var box = document.querySelector('[data-wiring]');
  if (!box) return;
  var slide = box.closest('.slide'), svg = box.querySelector('svg'), note = box.querySelector('.fig-caption');
  var tabs = [].slice.call(box.querySelectorAll('.wv-tabs button')), full = box.querySelector('.wv-full');
  var cur = 0, last = 0;

  function show(i) {
    cur = i;
    var v = tabs[i].getAttribute('data-view').split(' '), rect = svg.querySelector('rect');
    svg.setAttribute('viewBox', v.join(' '));
    ['x', 'y', 'width', 'height'].forEach(function (a, k) { rect.setAttribute(a, v[k]); });
    note.textContent = tabs[i].getAttribute('data-note');
    tabs.forEach(function (t, k) { t.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
  }
  function setFull(on) {
    box.classList.toggle('is-full', on);
    full.setAttribute('aria-pressed', on ? 'true' : 'false');
    full.textContent = on ? 'Thu nhỏ (Esc)' : 'Toàn màn hình';
    /* zoom và transform của slide sẽ làm lệch lớp phủ nên tạm gỡ */
    slide.classList.toggle('wv-open', on);
    if (!on && window.hermexFitSlide) window.hermexFitSlide(slide);
    else slide.style.zoom = '';
  }
  tabs.forEach(function (t, k) { t.addEventListener('click', function () { show(k); t.blur(); }); });
  full.addEventListener('click', function () { setFull(!box.classList.contains('is-full')); full.blur(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setFull(false); });

  slide.hermexStep = function (dir) {
    var n = cur + dir;
    if (n < 0 || n >= tabs.length) { setFull(false); return false; }
    show(n);
    return true;
  };
  document.addEventListener('hermex:slide', function (e) {
    var all = [].slice.call(document.querySelectorAll('.slide')), me = all.indexOf(slide);
    if (e.detail.index === me) show(last > me ? tabs.length - 1 : 0);
    else setFull(false);
    last = e.detail.index;
  });
})();
