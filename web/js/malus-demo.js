/* ============================================================
   js/malus-demo.js
   Drives the interactive Malus-law polarization demo on Slide 10.
   Self-contained: only touches elements suffixed "10", so it will
   not collide with ids used anywhere else in the deck.
   ============================================================ */

(function () {
  "use strict";

  var slider = document.getElementById("malusSlider10");
  if (!slider) return; // slide not present on this page — nothing to do

  var angleLabel = document.getElementById("malusAngleLabel10");
  var intensityLabel = document.getElementById("malusIntensity10");
  var formulaLabel = document.getElementById("malusFormula10");
  var callout = document.getElementById("malusCallout10");
  var filterLine = document.getElementById("malusFilterLine10");
  var beamFill = document.getElementById("malusBeamFill10");

  function calloutFor(angleDeg) {
    if (angleDeg <= 15) {
      return "Hai kính cùng hướng — ánh sáng truyền qua gần như trọn vẹn, tương ứng lúc Bob đo đúng basis Alice đã dùng.";
    }
    if (angleDeg < 75) {
      return "Hai kính lệch nhau một góc trung gian — ánh sáng giảm dần liên tục theo cos², không \"bật/tắt\" đột ngột.";
    }
    if (angleDeg <= 105) {
      return "Hai kính gần như vuông góc — ánh sáng lọt qua gần như bằng 0, tương ứng lúc Bob đo sai basis Alice đã dùng.";
    }
    if (angleDeg < 165) {
      return "Góc lệch tiếp tục tăng qua 90° — cường độ truyền qua tăng trở lại theo đúng chu kỳ của hàm cos².";
    }
    return "Hai kính lệch gần 180° — trục kính gần như song song ngược chiều, ánh sáng lại truyền qua gần trọn vẹn.";
  }

  function update(angleDeg) {
    var rad = (angleDeg * Math.PI) / 180;
    var intensity = Math.pow(Math.cos(rad), 2);
    var pct = Math.round(intensity * 100);

    angleLabel.textContent = angleDeg + "°";
    intensityLabel.textContent = pct + "%";
    formulaLabel.textContent = "cos²(" + angleDeg + "°) = " + intensity.toFixed(2);
    filterLine.style.transform = "rotate(" + angleDeg + "deg)";
    beamFill.style.width = pct + "%";
    callout.textContent = calloutFor(angleDeg);
  }

  slider.addEventListener("input", function () {
    update(parseInt(slider.value, 10));
  });

  // initialize to slider's starting value on load
  update(parseInt(slider.value, 10));
})();
