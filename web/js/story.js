/* Tương tác cho kham-pha.html. Không dùng thư viện ngoài. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var all = function (q) { return Array.prototype.slice.call(document.querySelectorAll(q)); };
  var malus = function (d) { return Math.pow(Math.cos(d * Math.PI / 180), 2); };

  /* Hiện dần khi cuộn tới */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  all('.reveal').forEach(function (el) { io.observe(el); });

  addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    $('progress').style.transform = 'scaleX(' + (h ? scrollY / h : 0) + ')';
  }, { passive: true });

  /* Tia dẫn đường: mỗi phần tự sáng dần theo vị trí cuộn */
  var secs = all('main section'), queued = false;
  function beam() {
    queued = false;
    var line = innerHeight * 0.65;
    secs.forEach(function (s) {
      var r = s.getBoundingClientRect(), p = Math.max(0, Math.min(1, (line - r.top) / r.height));
      s.style.setProperty('--p', p.toFixed(4));
      s.classList.toggle('lit', line - r.top > 120);
    });
  }
  addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(beam); } }, { passive: true });
  addEventListener('resize', beam);
  beam();

  /* Hero và bốn góc dùng chung góc của Alice */
  var alice = 45;
  function optics() {
    var b = +$('bob').value, d = Math.abs(b - alice), I = malus(d);
    $('needleA').setAttribute('transform', 'rotate(' + alice + ')');
    $('needleB').setAttribute('transform', 'rotate(' + b + ')');
    $('beamOut').style.opacity = 0.08 + 0.92 * I;
    $('glow').style.opacity = 0.55 * I;
    $('delta').textContent = d + '°';
    $('intensity').textContent = Math.round(I * 100) + '%';
  }
  $('bob').addEventListener('input', optics);

  function pickAngle(a) {
    alice = a;
    all('.angle').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.dataset.angle === a)); });
    var same = a % 90 === 0 ? '0° hoặc 90° (basis +)' : '45° hoặc 135° (basis ×)';
    var other = a % 90 === 0 ? 'basis ×' : 'basis +';
    $('angleText').textContent = 'Bob đo trong ' + same + ' thì đọc đúng. Đo bằng ' + other + ' thì kết quả là 50/50.';
    optics();
  }
  all('.angle').forEach(function (x) { x.addEventListener('click', function () { pickAngle(+x.dataset.angle); }); });
  pickAngle(45);

  /* Sáu bước: sân khấu đổi theo đoạn đang đọc */
  var steps = all('.step');
  var show = [['a', 'bit'], ['a', 'bit'], ['a', 'bit', 'beam', 'b'], ['a', 'bit', 'beam', 'b', 'bobbit'],
    ['a', 'bit', 'beam', 'b', 'bobbit', 'sift'], ['a', 'bit', 'beam', 'b', 'bobbit', 'sift', 'qber']];
  function setStep(i) {
    steps.forEach(function (s, n) { s.classList.toggle('on', n === i); });
    all('.dots i').forEach(function (d, n) { d.classList.toggle('on', n <= i); });
    all('[data-part]').forEach(function (p) { p.style.opacity = show[i].indexOf(p.dataset.part) > -1 ? 1 : 0.12; });
    $('stA').style.transform = 'rotate(' + (i >= 1 ? 135 : 0) + 'deg)';
    $('stB').style.transform = 'rotate(' + (i >= 3 ? 135 : 0) + 'deg)';
  }
  var so = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
  }, { rootMargin: '-50% 0px -45% 0px' });
  steps.forEach(function (s) { so.observe(s); });
  setStep(0);

  /* Mô phỏng intercept-resend, cùng mô hình với js/sim-round.js */
  var sent = 0, kept = 0, errors = 0, recent = [];
  var coin = function () { return Math.random() < 0.5 ? 0 : 1; };
  function round() {
    var aBit = coin(), aBasis = coin(), bit = aBit, basis = aBasis;
    if ($('eve').checked) { var e = coin(); bit = e === basis ? bit : coin(); basis = e; }
    var bBasis = coin(), bBit = bBasis === basis ? bit : coin();
    sent++;
    var cls = '';
    if (bBasis === aBasis) { kept++; cls = 'keep'; if (bBit !== aBit) { errors++; cls = 'err'; } }
    recent.push(cls); if (recent.length > 24) recent.shift();
  }
  function paint() {
    var q = kept ? errors / kept * 100 : 0, bad = q > 11;
    $('sent').textContent = sent;
    $('kept').textContent = kept;
    $('qber').textContent = q.toFixed(1).replace('.', ',') + '%';
    $('bits').innerHTML = recent.map(function (c) { return '<span class="' + c + '"></span>'; }).join('');
    $('arc').style.strokeDasharray = Math.min(q, 50) + ' 50';
    $('qberBox').className = 'gauge ' + (kept ? (bad ? 'bad' : 'ok') : '');
    $('verdict').className = 'verdict ' + (kept ? (bad ? 'bad' : 'ok') : '');
    $('verdict').textContent = !kept ? 'Chưa có dữ liệu. Bấm gửi bit để bắt đầu.'
      : (bad ? 'QBER vượt 11%: huỷ khoá, nghi có nghe lén.' : 'QBER không quá 11%: chấp nhận khoá.') + (kept < 40 ? ' Mẫu còn nhỏ, hãy gửi thêm.' : '');
  }
  function reset() { sent = kept = errors = 0; recent = []; paint(); }
  function send(n) { for (var i = 0; i < n; i++) round(); paint(); }
  $('run').addEventListener('click', function () { send(24); });
  $('run500').addEventListener('click', function () { send(500); });
  $('reset').addEventListener('click', reset);
  $('eve').addEventListener('change', reset);

  /* XOR trên ảnh 32x32 tự vẽ (hình mặt số bốn góc), khoá 64 bit lặp lại */
  var N = 32, img = [];
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
    var dx = x - 15.5, dy = y - 15.5, r = Math.hypot(dx, dy);
    var on = (r > 11 && r < 14) || (r < 11 && (Math.abs(dx + dy) < 1.5)) || r < 2.5;
    img.push(on ? 230 : 35);
  }
  var seed = 7, rnd = function () { seed = (seed * 48271) % 2147483647; return seed; };
  var key = [], order = [];
  for (var i = 0; i < 64; i++) { key.push(rnd() % 2); order.push(i); }
  order.sort(function () { return (rnd() % 3) - 1; });
  function stream(k, p) { var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | k[(p * 8 + j) % 64]; return v; }
  function draw(id, px) {
    var c = $(id).getContext('2d'), d = c.createImageData(N, N);
    px.forEach(function (v, p) { d.data.set([v, v, v, 255], p * 4); });
    c.putImageData(d, 0, 0);
  }
  var enc = img.map(function (v, p) { return v ^ stream(key, p); });
  function xor() {
    var n = +$('wrong').value, k = key.slice();
    for (var i = 0; i < n; i++) k[order[i]] ^= 1;
    $('wrongOut').textContent = n;
    draw('c2', enc.map(function (v, p) { return v ^ stream(k, p); }));
  }
  draw('c0', img); draw('c1', enc);
  $('wrong').addEventListener('input', xor);
  xor();

  /* Đánh dấu mục đang xem trên thanh điều hướng */
  var links = all('nav a[href^="#"]');
  var no = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) {
        if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  all('main section').forEach(function (s) { no.observe(s); });

  $('zoom').addEventListener('click', function () { $('dlg').showModal(); });
})();
