/**
 * MOTION.JS — chuyển cảnh, hiện nội dung theo nhịp và mô phỏng quang học ở bìa.
 * Chỉ nghe sự kiện hermex:slide, không đổi logic của deck.
 */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var OUT = 'cubic-bezier(.22,1,.36,1)';
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var prev = -1, leaveTimer;
  var sweep = document.createElement('div');
  sweep.className = 'laser-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sweep);

  /* Trang nền xanh: bìa, trang mở mỗi mục, trang chỉ có tiêu đề và trang kết */
  /* Màu nền xoay vòng: xanh, đỏ, vàng */
  slides.forEach(function (s, i) { s.classList.add(['c-blue', 'c-red', 'c-yellow'][i % 3]); });

  var seen = {};
  slides.forEach(function (s, i) {
    var name = s.getAttribute('data-section');
    if (!seen[name] || s.classList.contains('slide-stub') || s.children.length === 1 || i === slides.length - 1) s.classList.add('tone-blue');
    seen[name] = true;
  });

  function play(el, frames, delay, duration) {
    el.animate(frames, { duration: duration || 700, delay: delay, easing: OUT, fill: 'backwards' });
  }

  /* Mỗi loại khối có một kiểu xuất hiện riêng; chạy một lần khi vào trang rồi đứng yên */
  function reveal(slide) {
    var items = [];
    Array.prototype.forEach.call(slide.children, function (el) {
      if (el.matches('.side-glyph')) return;
      if (el.matches('.grid-2,.grid-3,.grid-4,.keylist,.arch-grid,.layers,.refs')) items.push.apply(items, el.children);
      else items.push(el);
    });
    items.forEach(function (el, i) {
      var delay = 220 + Math.min(i * 90, 720);
      var group = el.parentElement !== slide;
      if (el.matches('.slide-title')) { /* tiêu đề được tia sáng "viết" ra từ trái sang */
        play(el, [{ clipPath: 'inset(-20% 100% -20% 0)', translate: '-24px 0' }, { clipPath: 'inset(-20% -5% -20% 0)', translate: '0 0' }], delay, 800);
      } else if (group) { /* thẻ: bay vào so le và nảy nhẹ */
        var side = i % 2 ? 60 : -60;
        play(el, [{ opacity: 0, translate: side + 'px 30px', scale: '.9' }, { opacity: 1, translate: '0 -6px', scale: '1.02', offset: .72 }, { opacity: 1, translate: '0 0', scale: '1' }], delay, 850);
      } else if (el.matches('.callout,.warn-box,.safe-box')) { /* khung kết luận: trượt ngang */
        play(el, [{ opacity: 0, translate: '-70px 0' }, { opacity: 1, translate: '0 0' }], delay + 200, 700);
      } else if (el.matches('.diagram-frame,.fig-group,.cal-fig,.formula-box,.mo-hinh')) { /* hình: phóng nhẹ */
        play(el, [{ opacity: 0, scale: '.88' }, { opacity: 1, scale: '1' }], delay, 750);
      } else {
        play(el, [{ opacity: 0, translate: '0 34px' }, { opacity: 1, translate: '0 0' }], delay);
      }
    });

    /* Bảng: các dòng hiện lần lượt (bỏ qua nhật ký mô phỏng) */
    slide.querySelectorAll('table:not(.heat)').forEach(function (t) {
      if (t.closest('.log')) return;
      Array.prototype.forEach.call(t.querySelectorAll('tbody tr'), function (tr, r) {
        Array.prototype.forEach.call(tr.cells, function (c) {
          play(c, [{ opacity: 0, translate: '-28px 0' }, { opacity: 1, translate: '0 0' }], 520 + Math.min(r * 110, 900), 550);
        });
      });
    });
    /* Bản đồ nhiệt: ô hiện theo đường chéo; đồ thị chấm: chấm rơi vào chỗ */
    slide.querySelectorAll('.heat td').forEach(function (c) {
      play(c, [{ opacity: 0, scale: '.4' }, { opacity: 1, scale: '1' }], 450 + (c.cellIndex + c.parentElement.rowIndex) * 80, 450);
    });
    slide.querySelectorAll('.cal-fig circle').forEach(function (c, i) {
      play(c, [{ opacity: 0, translate: '0 -18px' }, { opacity: 1, translate: '0 0' }], 500 + (i % 80) * 9, 450);
    });

    /* Sơ đồ SVG: nét liền được vẽ dần */
    slide.querySelectorAll('.diagram-frame svg :is(line,path,polyline)').forEach(function (p, i) {
      if (p.closest('marker') || p.getAttribute('stroke-dasharray') || !p.getTotalLength) return;
      var len = p.getTotalLength();
      if (len > 20) play(p, [{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], 450 + Math.min(i * 40, 600), 1100);
    });

    /* Số liệu đơn (ví dụ 84%, 45°) đếm từ 0 */
    slide.querySelectorAll('.stat .num').forEach(function (n) {
      var text = n.dataset.v || (n.dataset.v = n.textContent.trim());
      var m = text.match(/^(\d+)(%|°)?$/);
      if (!m) return;
      var start = performance.now();
      (function tick(now) {
        var t = Math.min(Math.max((now - start - 300) / 1100, 0), 1);
        n.textContent = Math.round(m[1] * (1 - Math.pow(1 - t, 3))) + (m[2] || '');
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    });
  }

  function onSlide(index) {
    var slide = slides[index];
    var needle = document.querySelector('.logo .dial line');
    if (needle) needle.style.transform = 'rotate(' + index * 45 + 'deg)';
    if (!reduce) {
      clearTimeout(leaveTimer);
      slides.forEach(function (s) { s.classList.remove('leaving'); });
      if (prev >= 0 && prev !== index) {
        var old = slides[prev];
        old.classList.add('leaving');
        leaveTimer = setTimeout(function () { old.classList.remove('leaving'); }, 800);
        var name = slide.getAttribute('data-section');
        var newSection = index > 0 && slides[index - 1].getAttribute('data-section') !== name && index > prev;
        if (newSection) { /* sang phần mới: mở tròn từ giữa */
          play(slide, [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(125% at 50% 50%)' }], 0, 800);
        } else { /* trong cùng phần: tia laser quét kéo theo trang mới */
          var forward = index > prev;
          play(slide, [{ clipPath: forward ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 0, 750);
          sweep.animate([{ left: forward ? '100%' : '0%', opacity: 1 }, { left: forward ? '5%' : '95%', opacity: 1, offset: .95 }, { left: forward ? '0%' : '100%', opacity: 0 }], { duration: 750, easing: OUT });
        }
      }
      reveal(slide);
    }
    prev = index;
  }
  document.addEventListener('hermex:slide', function (e) { onSlide(e.detail.index); });

  /* ---------- Bìa: laser → kính Alice → kính Bob → LDR, theo định luật Malus ---------- */
  function optics() {
    var canvas = document.getElementById('opticsCanvas');
    if (!canvas) return;
    var box = canvas.parentElement, cover = box.closest('.slide'), ctx = canvas.getContext('2d');
    var out = { a: document.getElementById('opA'), b: document.getElementById('opB'), i: document.getElementById('opI') };
    var a = 45, b = 45, t = 0, last = 0;
    /* tự quay liên tục; bấm vào khung (hoặc Enter) để dừng và chạy tiếp */
    var running = !reduce, tip = box.querySelector('.optics-tip');
    function label() { tip.textContent = running ? 'Bấm vào khung để dừng' : 'Bấm vào khung để cho kính quay'; }
    function toggle() { running = !running; label(); }
    box.setAttribute('tabindex', '0');
    box.addEventListener('click', toggle);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
    label();

    function filter(x, y, r, deg, name) {
      ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.fillStyle = 'rgba(43,47,232,.35)';
      ctx.beginPath(); ctx.ellipse(x, y, r * .55, r, 0, 0, 7); ctx.fill(); ctx.stroke();
      var t = deg * Math.PI / 180, dx = Math.sin(t) * r * .55, dy = -Math.cos(t) * r;
      ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(name, x, y + r + 26);
    }
    function beam(x1, x2, y, power, now) {
      ctx.lineCap = 'butt';
      [[16, .18], [7, .45], [2.5, 1]].forEach(function (l) {
        ctx.strokeStyle = 'rgba(255,46,85,' + l[1] * (.08 + .92 * power) + ')';
        ctx.lineWidth = l[0]; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255,255,255,' + power + ')';
      for (var x = x1 + (now * .12) % 38; x < x2; x += 38) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!cover.classList.contains('active') || !canvas.clientWidth) return;
      var dt = Math.max(0, Math.min(now - last, 50)); last = now;
      var w = canvas.clientWidth, h = canvas.clientHeight, d = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * d)) canvas.width = Math.round(w * d);
      if (canvas.height !== Math.round(h * d)) canvas.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);

      if (running) t += dt;
      /* Bob quay đều 180° trong 6 giây; Alice đổi sang góc kế tiếp sau mỗi vòng đó */
      var aGoal = [45, 90, 135, 0][Math.floor(t / 6000) % 4];
      var diff = ((aGoal - a) % 180 + 270) % 180 - 90; /* đi đường ngắn nhất */
      a = (a + diff * (1 - Math.exp(-dt / 170)) + 180) % 180;
      b = (45 + t * 0.03) % 180;
      var I = Math.pow(Math.cos((a - b) * Math.PI / 180), 2);

      var y = h * .45, r = Math.min(h * .26, w * .17), xa = w * .32, xb = w * .62, xl = w * .88;
      ctx.font = '600 14px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#FF2E55'; ctx.fillRect(w * .02, y - 13, w * .09, 26);
      ctx.fillStyle = '#FFFFFF'; ctx.fillText('Laser', w * .065, y + r + 26);
      beam(w * .11, xa, y, 1, now); beam(xa, xb, y, 1, now); beam(xb, xl, y, I, now);
      filter(xa, y, r, a, 'Alice'); filter(xb, y, r, b, 'Bob');
      var glow = ctx.createRadialGradient(xl + 12, y, 4, xl + 12, y, 20 + 46 * I);
      glow.addColorStop(0, 'rgba(255,212,59,' + I + ')'); glow.addColorStop(1, 'rgba(255,212,59,0)');
      ctx.fillStyle = glow; ctx.fillRect(xl - 60, y - 80, 150, 160);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(xl, y - 18, 24, 36);
      ctx.fillStyle = '#FFFFFF'; ctx.fillText('LDR', xl + 12, y + r + 26);

      out.a.textContent = Math.round(a) % 180 + '°';
      out.b.textContent = Math.round(b) % 180 + '°';
      out.i.textContent = Math.round(I * 100) + '%';
    }
    requestAnimationFrame(frame);
  }

  optics();
  if (window.getCurrentSlide) onSlide(window.getCurrentSlide());
})();
