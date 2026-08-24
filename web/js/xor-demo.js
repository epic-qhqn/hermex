/* ============================================================
   js/xor-demo.js
   Drives the interactive XOR-key-mismatch demo on the
   "Ứng dụng thực tế" slide.

   An 8×8 grid (64 pixels = 64 key bits) is drawn as the
   "Ảnh gốc". XOR is self-inverse, so decrypting with a key that
   has N bits wrong is equivalent to flipping exactly those N
   pixels of the original image — which is what this draws as
   "Giải mã bằng khoá bị lệch". The N flipped positions are drawn
   from a fixed shuffled order (computed once on load) so that
   moving the slider up adds corruption incrementally instead of
   re-randomizing the whole picture on every tick.
   ============================================================ */

(function () {
  "use strict";

  var slider = document.getElementById("wrongBitsSlider");
  if (!slider) return; // slide not present on this page

  var origCanvas = document.getElementById("xorOrigCanvas");
  var resultCanvas = document.getElementById("xorResultCanvas");
  var label = document.getElementById("wrongBitsLabel");

  var GRID = 8; // 8x8 = 64 bits, matching the slider's "trên 64 bit"

  // 1 = dark block, 0 = light background.
  // Symmetric corner-brackets + center-square icon.
  var PATTERN = [
    1, 1, 0, 0, 0, 0, 1, 1,
    1, 1, 0, 0, 0, 0, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 1, 1, 0, 0, 0,
    0, 0, 0, 1, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 0, 0, 0, 0, 1, 1,
    1, 1, 0, 0, 0, 0, 1, 1
  ];

  var LIGHT = "#E7ECF2";
  var DARK =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent-deep")
      .trim() || "#1B3A63";

  // Fixed shuffled bit order, computed once, so increasing N only
  // adds newly-flipped pixels rather than re-picking everything.
  var order = [];
  for (var i = 0; i < GRID * GRID; i++) order.push(i);
  for (var j = order.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var tmp = order[j];
    order[j] = order[k];
    order[k] = tmp;
  }

  function drawGrid(canvas, bits) {
    var ctx = canvas.getContext("2d");
    var cell = canvas.width / GRID;
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        ctx.fillStyle = bits[r * GRID + c] ? DARK : LIGHT;
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }

  function update(n) {
    label.textContent = n;

    drawGrid(origCanvas, PATTERN);

    var flipped = PATTERN.slice();
    for (var i = 0; i < n; i++) {
      var idx = order[i];
      flipped[idx] = flipped[idx] ? 0 : 1;
    }
    drawGrid(resultCanvas, flipped);
  }

  slider.addEventListener("input", function () {
    update(parseInt(slider.value, 10));
  });

  update(parseInt(slider.value, 10));
})();
