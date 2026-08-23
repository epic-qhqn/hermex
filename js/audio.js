/**
 * ==========================================================================
 * AUDIO.JS — HỆ THỐNG ÂM THANH TƯƠNG TÁC THÔNG MINH (WEB AUDIO API SYNTH)
 * Tự động tổng hợp âm thanh Hi-tech micro-SFX thời gian thực,
 * 100% offline, zero-latency, không phụ thuộc file mp3 ngoài.
 * Mặc định: BẬT âm thanh.
 * ==========================================================================
 */
(function (window) {
  let audioCtx = null;
  let isMuted = false; // Mặc định BẬT âm thanh theo yêu cầu

  /**
   * Khởi tạo hoặc khôi phục AudioContext khi có tương tác đầu tiên
   */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  /**
   * Thiết lập trạng thái bật/tắt âm thanh
   */
  function setSoundEnabled(enabled) {
    isMuted = !enabled;
    if (enabled) {
      getAudioContext();
      playToggleSound(true);
    } else {
      playToggleSound(false);
    }
  }

  function isSoundEnabled() {
    return !isMuted;
  }

  /**
   * 1. ÂM THANH CHUYỂN SLIDE (Futuristic Soft Chime / Quantum Sweep)
   */
  function playSlideSound() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Quét tần số mềm mại từ 480Hz lên 720Hz rồi hạ nhẹ
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);

    // Biên độ âm lượng mềm dịu, không gây chói tai
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * 2. ÂM THANH CLICK NÚT ĐIỀU KHIỂN (Crisp Micro-Click)
   */
  function playClickSound() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * 3. ÂM THANH LIGHTBOX MỞ / ĐÓNG (Ambient Resonance Tone)
   */
  function playLightboxSound(isOpen) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    if (isOpen) {
      // Âm thanh mở: Hợp âm ngân vang ấm áp (C5 + G5)
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(783.99, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    } else {
      // Âm thanh đóng: Tông hạ nhẹ êm dịu
      osc1.frequency.setValueAtTime(659.25, now);
      osc2.frequency.setValueAtTime(440.0, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  /**
   * 4. ÂM THANH BẬT / TẮT ÂM THANH (Two-Tone Melodic Chirp)
   */
  function playToggleSound(enabled) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (enabled) {
      // Âm bật: đi lên (520Hz -> 880Hz)
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(880, now + 0.06);
    } else {
      // Âm tắt: đi xuống (750Hz -> 380Hz)
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.setValueAtTime(380, now + 0.06);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Xuất các hàm ra toàn cục
  window.HermexAudio = {
    setSoundEnabled,
    isSoundEnabled,
    playSlideSound,
    playClickSound,
    playLightboxSound,
    playToggleSound,
  };
})(window);
