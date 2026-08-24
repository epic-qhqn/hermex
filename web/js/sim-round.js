/* ============================================================
   js/sim-round.js
   Drives the live BB84 round simulator on Slide 19
   ("Chạy thử một phiên trao đổi khoá").

   Model:
     - Alice picks a random bit (0/1) and random basis (rect/diag),
       which together set a servo angle (0/45/90/135°).
     - If Eve is enabled, she intercepts: measures with her own
       random basis (reading correctly only if her basis matches
       Alice's), then resends a photon prepared in her own
       basis/bit — this is the standard intercept-resend attack.
     - Bob measures with his own random basis. If his basis
       matches whatever was actually sent (Alice's, or Eve's
       resend), he reads the correct bit; otherwise the result
       collapses randomly (no-cloning theorem).
     - A round is "sifted" (kept) only when Alice's and Bob's
       basis match. QBER is computed by comparing Alice's
       original bit against Bob's measured bit across all sifted
       rounds (a simplification made explicit in the on-slide note).
   ============================================================ */

(function () {
  "use strict";

  var stepBtn = document.getElementById("simStepBtn");
  if (!stepBtn) return; // slide not present on this page

  var autoBtn = document.getElementById("simAutoBtn");
  var resetBtn = document.getElementById("simResetBtn");
  var eveToggle = document.getElementById("simEveToggle");

  var aliceNeedle = document.getElementById("simAliceNeedle");
  var aliceTag = document.getElementById("simAliceTag");
  var aliceReadout = document.getElementById("simAliceReadout");

  var bobLdrFill = document.getElementById("simLdrFill");
  var bobTag = document.getElementById("simBobTag");
  var bobReadout = document.getElementById("simBobReadout");

  var photon = document.getElementById("simPhoton");
  var eveBadge = document.getElementById("simEveBadge");

  var logBody = document.getElementById("simLogBody");
  var keyBitsEl = document.getElementById("simKeyBits");
  var qberValueEl = document.getElementById("simQberValue");
  var qberFillEl = document.getElementById("simQberFill");
  var verdictEl = document.getElementById("simVerdict");
  var railSteps = document.querySelectorAll("#simRail .rail-step");

  var MAX_QBER_DISPLAY = 50; // bar's visual full-scale, in percent
  var MIN_SAMPLE = 8; // minimum sifted bits before verdict is meaningful — kept low because
  // "Chạy 24 vòng tự động" only yields ~12 sifted bits on average (sift rate ~50%);
  // a higher threshold would routinely leave a single run showing no QBER at all.
  var CONFIDENT_SAMPLE = 16; // below this, flag that the estimate is still noisy

  var roundCount = 0;
  var aliceBits = [];
  var bobBits = [];
  var autoTimer = null;
  var railTimers = [];

  var BASES = ["rect", "diag"];

  function randomBit() {
    return Math.random() < 0.5 ? 0 : 1;
  }

  function randomBasis() {
    return BASES[Math.random() < 0.5 ? 0 : 1];
  }

  function basisSymbol(basis) {
    return basis === "rect" ? "+" : "×";
  }

  function angleFor(basis, bit) {
    if (basis === "rect") return bit === 0 ? 0 : 90;
    return bit === 0 ? 45 : 135;
  }

  function highlightRail() {
    railTimers.forEach(clearTimeout);
    railTimers = [];
    railSteps.forEach(function (el) {
      el.classList.remove("active");
    });
    railSteps.forEach(function (el, i) {
      railTimers.push(
        setTimeout(function () {
          el.classList.add("active");
          if (i > 0) railSteps[i - 1].classList.remove("active");
          if (i === railSteps.length - 1) {
            railTimers.push(
              setTimeout(function () {
                el.classList.remove("active");
              }, 260)
            );
          }
        }, i * 140)
      );
    });
  }

  function runRound() {
    var eveEnabled = eveToggle.checked;

    // 1–2. Alice sinh bit + basis, servo xoay góc
    var aliceBit = randomBit();
    var aliceBasis = randomBasis();
    var aliceAngle = angleFor(aliceBasis, aliceBit);

    aliceNeedle.style.transform = "rotate(" + aliceAngle + "deg)";
    aliceTag.textContent = "θ=" + aliceAngle + "°";
    aliceReadout.textContent =
      "Bit " + aliceBit + " · Basis " + basisSymbol(aliceBasis);

    // photon in flight (cosmetic)
    photon.setAttribute("opacity", "1");
    setTimeout(function () {
      photon.setAttribute("opacity", "0");
    }, 450);

    // 3. Truyền qua kênh quang — Eve có thể chặn ở đây
    var sentBasis = aliceBasis;
    var sentBit = aliceBit;
    var sentAngle = aliceAngle;

    if (eveEnabled) {
      eveBadge.classList.add("active");
      var eveBasis = randomBasis();
      var eveBit = eveBasis === aliceBasis ? aliceBit : randomBit();
      sentBasis = eveBasis;
      sentBit = eveBit;
      sentAngle = angleFor(eveBasis, eveBit);
    } else {
      eveBadge.classList.remove("active");
    }

    // 4. Bob đo bằng LDR với basis ngẫu nhiên của riêng mình
    var bobBasis = randomBasis();
    var bobBit;
    if (bobBasis === sentBasis) {
      bobBit = sentBit;
    } else {
      bobBit = randomBit();
    }

    var diff = Math.abs(angleFor(bobBasis, 0) - sentAngle);
    diff = Math.min(diff, 180 - diff);
    var transmitted = Math.pow(Math.cos((diff * Math.PI) / 180), 2);
    bobLdrFill.setAttribute("width", (48 * transmitted).toFixed(1));

    bobTag.textContent = "θ=" + angleFor(bobBasis, 0) + "°";
    bobReadout.textContent =
      "Bit đo " + bobBit + " · Basis " + basisSymbol(bobBasis);

    // 5. So sánh basis (sifting)
    var match = aliceBasis === bobBasis;
    if (match) {
      aliceBits.push(aliceBit);
      bobBits.push(bobBit);
    }

    // 6. Cập nhật log + QBER
    roundCount++;
    appendLogRow(roundCount, aliceBit, bobBit, aliceBasis, bobBasis, match);
    updateMetrics();
    highlightRail();
  }

  function appendLogRow(n, aBit, bBit, aBasis, bBasis, match) {
    var tr = document.createElement("tr");

    var basisText =
      basisSymbol(aBasis) + " / " + basisSymbol(bBasis) + (match ? " ✓" : " ✗");
    var resultText = match ? "Giữ khoá" : "Bỏ qua";
    var resultClass = match ? "kept" : "discarded";

    tr.innerHTML =
      "<td>" + n + "</td>" +
      "<td>" + aBit + "</td>" +
      "<td>" + bBit + "</td>" +
      "<td>" + basisText + "</td>" +
      '<td class="' + resultClass + '">' + resultText + "</td>";

    logBody.appendChild(tr);
    logBody.parentElement.parentElement.scrollTop =
      logBody.parentElement.parentElement.scrollHeight;
  }

  function updateMetrics() {
    var n = aliceBits.length;

    if (n === 0) {
      keyBitsEl.textContent = "—";
    } else {
      keyBitsEl.textContent = bobBits.join("") + " (" + n + " bit)";
    }

    if (n < MIN_SAMPLE) {
      qberValueEl.textContent = "—";
      qberFillEl.style.width = "0%";
      verdictEl.className = "verdict idle";
      verdictEl.textContent =
        "Chưa đủ dữ liệu — chạy vài vòng để ước lượng QBER.";
      return;
    }

    var errors = 0;
    for (var i = 0; i < n; i++) {
      if (aliceBits[i] !== bobBits[i]) errors++;
    }
    var qber = (errors / n) * 100;
    var lowConfidence = n < CONFIDENT_SAMPLE;
    var caveat = lowConfidence
      ? " (mẫu còn nhỏ — " + n + " bit, chạy thêm vòng để chắc chắn hơn)"
      : "";

    qberValueEl.innerHTML =
      qber.toFixed(1) +
      '%<span class="m-value-sub"> (' + errors + "/" + n + " bit sai)</span>";
    qberFillEl.style.width =
      Math.min((qber / MAX_QBER_DISPLAY) * 100, 100) + "%";

    if (qber <= 11) {
      verdictEl.className = "verdict safe";
      verdictEl.textContent =
        "An toàn — QBER trong ngưỡng cho phép, không phát hiện dấu hiệu nghe lén." +
        caveat;
    } else {
      verdictEl.className = "verdict danger";
      verdictEl.textContent =
        "Cảnh báo — QBER vượt ngưỡng 11%, nghi ngờ có nghe lén!" + caveat;
    }
  }

  function resetAll() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      setAutoRunningUI(false);
    }
    railTimers.forEach(clearTimeout);
    railTimers = [];
    railSteps.forEach(function (el) {
      el.classList.remove("active");
    });

    roundCount = 0;
    aliceBits = [];
    bobBits = [];

    logBody.innerHTML = "";
    keyBitsEl.textContent = "—";
    qberValueEl.textContent = "—";
    qberFillEl.style.width = "0%";
    verdictEl.className = "verdict idle";
    verdictEl.textContent = "Chưa đủ dữ liệu — chạy vài vòng để ước lượng QBER.";

    aliceNeedle.style.transform = "rotate(0deg)";
    aliceTag.textContent = "—";
    aliceReadout.textContent = "Sẵn sàng";
    bobLdrFill.setAttribute("width", "0");
    bobTag.textContent = "—";
    bobReadout.textContent = "Sẵn sàng";
    eveBadge.classList.remove("active");
    photon.setAttribute("opacity", "0");
  }

  function setAutoRunningUI(running) {
    stepBtn.disabled = running;
    resetBtn.disabled = running;
    autoBtn.textContent = running ? "Đang chạy… (bấm để dừng)" : "Chạy 24 vòng tự động";
  }

  stepBtn.addEventListener("click", runRound);

  resetBtn.addEventListener("click", resetAll);

  autoBtn.addEventListener("click", function () {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      setAutoRunningUI(false);
      return;
    }
    setAutoRunningUI(true);
    var remaining = 24;
    autoTimer = setInterval(function () {
      runRound();
      remaining--;
      if (remaining <= 0) {
        clearInterval(autoTimer);
        autoTimer = null;
        setAutoRunningUI(false);
      }
    }, 260);
  });
})();
