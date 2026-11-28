/* Khung xem 3D cho sa bàn, WebGL thuần, chạy được khi mở file trực tiếp. */
(function () {
  'use strict';
  var NHOM = [
    ['Đế laser', ['de_laser', 'tia_laser']],
    ['Trạm Alice', ['tram_alice', 'servo_mau_a', 'br_servo_alice', 'vong_alice', 'phe_alice', 'vong_chan_alice']],
    ['Trạm giữa', ['tram_giua']],
    ['Trạm Bob', ['tram_bob', 'servo_mau_b', 'br_servo_bob', 'vong_bob', 'phe_bob', 'vong_chan_bob']],
    ['Đế LDR', ['de_ldr', 'ldr_mau', 'pheu_ldr']],
    ['Khung đỡ', ['nhom_2040', 'chan_truoc_1', 'chan_truoc_2', 'khay_mach_1', 'khay_mach_2', 'kep_day']]
  ];
  var TACH = {
    de_laser: [-35, 0, 40], tram_alice: [0, 0, 45], servo_mau_a: [0, -80, 20], br_servo_alice: [14, -80, 50], vong_alice: [22, 0, 100],
    phe_alice: [-34, 0, 100], vong_chan_alice: [-18, 0, 100], tram_giua: [0, 0, 45], tram_bob: [0, 0, 45], servo_mau_b: [0, -80, 20],
    br_servo_bob: [-14, -80, 50], vong_bob: [-22, 0, 100], phe_bob: [34, 0, 100], vong_chan_bob: [18, 0, 100], de_ldr: [40, 0, 40],
    ldr_mau: [75, 0, 40], pheu_ldr: [-5, 0, 105], chan_truoc_1: [0, -55, -10], chan_truoc_2: [0, -55, -10],
    khay_mach_1: [0, 55, -10], khay_mach_2: [0, 55, -10], kep_day: [0, 0, 20]
  };
  function mau(p) {
    if (p.ten === 'tia_laser') return [1, 0.83, 0.23];
    if (p.ten === 'nhom_2040') return [0.78, 0.8, 0.86];
    if (p.ten === 'ldr_mau') return [0.2, 0.55, 1];
    if (p.ten.indexOf('servo_mau') === 0) return [0.32, 0.36, 0.5];
    return p.mau[0] > 0.5 ? [0.93, 0.2, 0.31] : [0.43, 0.48, 0.68];
  }
  function vec(s) {
    var b = atob(s), u = new Uint8Array(b.length), i;
    for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    var q = new Int16Array(u.buffer), v = new Float32Array(q.length * 2);
    for (i = 0; i < q.length; i += 9) {
      var a = [q[i] / 50, q[i + 1] / 50, q[i + 2] / 50], c = [q[i + 3] / 50, q[i + 4] / 50, q[i + 5] / 50], d = [q[i + 6] / 50, q[i + 7] / 50, q[i + 8] / 50];
      var x = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], y = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      var n = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
      var l = Math.hypot(n[0], n[1], n[2]) || 1;
      [a, c, d].forEach(function (p, k) { v.set([p[0], p[1], p[2], n[0] / l, n[1] / l, n[2] / l], i * 2 + k * 6); });
    }
    return v;
  }
  function mul(a, b) {
    var r = new Float32Array(16), i, j, k;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) for (k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
    return r;
  }
  function khung(box) {
    box.classList.add('mo-hinh');
    box.innerHTML = '<canvas tabindex="0" role="img" aria-label="Mô hình 3D sa bàn Hermex. Dùng phím mũi tên để xoay, phím cộng trừ để phóng."></canvas>' +
      '<div class="mh-nut"><button type="button" data-v="tach" aria-pressed="false">Tách chi tiết</button><button type="button" data-v="tia" aria-pressed="true">Tia laser</button>' +
      '<button type="button" data-v="to" aria-label="Phóng to">+</button><button type="button" data-v="nho" aria-label="Thu nhỏ">&minus;</button><button type="button" data-v="lai">Góc ban đầu</button></div>' +
      '<div class="mh-nhom" role="group" aria-label="Làm nổi một cụm">' + NHOM.map(function (n, i) { return '<button type="button" data-n="' + i + '" aria-pressed="false">' + n[0] + '</button>'; }).join('') + '</div>';
    var cv = box.querySelector('canvas'), gl = cv.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl || !window.MO_HINH) { box.textContent = 'Trình duyệt này không hiển thị được mô hình 3D.'; return; }
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec3 p,n;uniform mat4 m;uniform vec3 o;varying vec3 vn;void main(){vn=n;gl_Position=m*vec4(p+o,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float;uniform vec3 c,l;uniform float a,g;varying vec3 vn;void main(){vec3 n=normalize(vn);float d=abs(dot(n,l));float s=.42+.5*d+.12*max(n.z,0.);gl_FragColor=vec4(mix(c*s,c,g),a);}'));
    gl.linkProgram(pr); gl.useProgram(pr);
    var loc = {}; ['m', 'o', 'c', 'l', 'a', 'g'].forEach(function (k) { loc[k] = gl.getUniformLocation(pr, k); });
    var ap = gl.getAttribLocation(pr, 'p'), an = gl.getAttribLocation(pr, 'n');
    gl.enableVertexAttribArray(ap); gl.enableVertexAttribArray(an);
    var parts = window.MO_HINH.map(function (p) {
      var v = vec(p.v), b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
      return { ten: p.ten, b: b, n: v.length / 6, c: mau(p), a: p.ten.indexOf('servo_mau') === 0 ? 0.72 : 1 };
    }).sort(function (x, y) { return y.a - x.a; });

    var yaw, pitch, zoom, tach = 0, dich = 0, tia = true, chon = -1, cho = false;
    function lai() { yaw = -0.45; pitch = 0.42; zoom = 1; }
    lai();
    function ve() {
      cho = false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (!w || !h) return;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (Math.abs(dich - tach) > 0.002) { tach += (dich - tach) * 0.16; yeu(); } else tach = dich;
      var asp = w / h, f = 1 / Math.tan(0.25);
      var dist = Math.max((270 + 10 * tach) / (asp * Math.tan(0.25)), (125 + 45 * tach) / Math.tan(0.25)) / zoom;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -185, 0, -(30 + 35 * tach), 1];
      var Rz = [cy, sy, 0, 0, -sy, cy, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      /* đưa trục Z của FreeCAD lên trên, rồi nghiêng theo pitch */
      var Rx = [1, 0, 0, 0, 0, sp, -cp, 0, 0, cp, sp, 0, 0, 0, -dist, 1];
      var near = 10, far = 6000;
      var P = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(loc.m, false, mul(P, mul(Rx, mul(Rz, T))));
      gl.uniform3f(loc.l, 0.35, -0.55, 0.75);
      parts.forEach(function (p) {
        if (p.ten === 'tia_laser' && (!tia || tach > 0.02)) return;
        var sang = chon < 0 || NHOM[chon][1].indexOf(p.ten) > -1, o = TACH[p.ten] || [0, 0, 0];
        gl.uniform3f(loc.o, o[0] * tach, o[1] * tach, o[2] * tach);
        gl.uniform3fv(loc.c, p.c);
        gl.uniform1f(loc.a, sang ? p.a : 0.13);
        gl.uniform1f(loc.g, p.ten === 'tia_laser' ? 1 : 0);
        gl.depthMask(sang);
        gl.bindBuffer(gl.ARRAY_BUFFER, p.b);
        gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(an, 3, gl.FLOAT, false, 24, 12);
        gl.drawArrays(gl.TRIANGLES, 0, p.n);
      });
      gl.depthMask(true);
    }
    function yeu() { if (!cho) { cho = true; requestAnimationFrame(ve); } }
    function xoay(dx, dy) { yaw += dx; pitch = Math.max(-0.1, Math.min(1.5, pitch + dy)); yeu(); }
    function phong(k) { zoom = Math.max(0.7, Math.min(3, zoom * k)); yeu(); }

    var giu = null;
    cv.addEventListener('pointerdown', function (e) { giu = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) { if (!giu) return; xoay((e.clientX - giu[0]) * 0.008, (e.clientY - giu[1]) * 0.006); giu = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', function () { giu = null; });
    cv.addEventListener('pointercancel', function () { giu = null; });
    cv.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key];
      if (k) xoay(k[0], k[1]); else if (e.key === '+' || e.key === '=') phong(1.2); else if (e.key === '-') phong(1 / 1.2); else return;
      e.preventDefault(); e.stopPropagation(); /* không để phím mũi tên chuyển slide */
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      var v = b.dataset.v;
      if (v === 'tach') { dich = dich ? 0 : 1; b.setAttribute('aria-pressed', String(!!dich)); if (matchMedia('(prefers-reduced-motion: reduce)').matches) tach = dich; }
      if (v === 'tia') { tia = !tia; b.setAttribute('aria-pressed', String(tia)); }
      if (v === 'to') phong(1.25);
      if (v === 'nho') phong(0.8);
      if (v === 'lai') lai();
      if (b.dataset.n !== undefined) {
        chon = chon === +b.dataset.n ? -1 : +b.dataset.n;
        box.querySelectorAll('[data-n]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.dataset.n === chon)); });
      }
      yeu();
    });
    new ResizeObserver(yeu).observe(cv);
    yeu();
  }
  document.querySelectorAll('[data-mo-hinh]').forEach(khung);
})();
