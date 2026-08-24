/* ============================================================
   js/qber-analytic.js
   Drives the analytic QBER slider on Slide 20
   ("QBER: tỷ lệ lỗi bit lượng tử").

   Pure formula, no randomness: QBER ≈ 0.25 × (tỷ lệ photon bị
   Eve chặn đọc). Independent of the live round simulator on the
   previous slide.
   ============================================================ */

(function () {
  "use strict";

  var slider = document.getElementById("interceptSlider");
  if (!slider) return; // slide not present on this page

  var interceptLabel = document.getElementById("interceptLabel");
  var qberFill = document.getElementById("analyticQberFill");
  var verdict = document.getElementById("analyticVerdict");

  var MAX_QBER_DISPLAY = 50; // must match the scale used in sim-round.js

  function update(interceptPct) {
    interceptLabel.textContent = interceptPct + "%";

    var qber = 0.25 * interceptPct; // formula: QBER ≈ 0.25 × tỷ lệ chặn đọc

    qberFill.style.width =
      Math.min((qber / MAX_QBER_DISPLAY) * 100, 100) + "%";

    var safe = qber <= 11;
    verdict.className = "verdict " + (safe ? "safe" : "danger");
    verdict.textContent =
      interceptPct +
      "% bị chặn → QBER lý thuyết " +
      qber.toFixed(1) +
      "%, " +
      (safe ? "an toàn." : "vượt ngưỡng — nghi ngờ nghe lén!");
  }

  slider.addEventListener("input", function () {
    update(parseInt(slider.value, 10));
  });

  update(parseInt(slider.value, 10));
})();
