const ARP_NOTES = [110, 130.81, 164.81, 196, 220, 261.63, 329.63, 392];
const LOOK_AHEAD = 0.15;
const SCHEDULE_MS = 70;

export function createAudioController(getTickInterval, minMs, baseMs) {
  let audioCtx = null;
  let masterGain = null;
  let bgmRunning = false;
  let bgmScheduleId = null;
  let bgmAtmosOsc = null;
  let bgmAtmosOsc2 = null;
  let bgmPadGain = null;
  let arpStep = 0;
  let arpNextTime = 0;

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 1.0;
        masterGain.connect(audioCtx.destination);
      } catch (_) {
        return false;
      }
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    return true;
  }

  function tone(freq, type, volume, offsetSec, duration) {
    if (!ensureAudio()) return;

    const time = audioCtx.currentTime + offsetSec;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  function playEat() {
    tone(523.25, 'sine', 0.07, 0, 0.10);
    tone(783.99, 'sine', 0.05, 0.05, 0.09);
  }

  function playGameOverSFX() {
    tone(220, 'triangle', 0.10, 0, 0.30);
    tone(174.61, 'triangle', 0.08, 0.18, 0.28);
    tone(130.81, 'triangle', 0.06, 0.35, 0.35);
  }

  function playCountdownTick(isGo) {
    tone(isGo ? 880 : 600, 'sine', 0.15, 0, 0.12);
  }

  function softKick(time) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.07);
    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.10);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.11);
  }

  function softHat(time, volume) {
    if (!audioCtx) return;

    const buffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * 0.035), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    const hpf = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    hpf.type = 'highpass';
    hpf.frequency.value = 8000;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    source.buffer = buffer;
    source.connect(hpf);
    hpf.connect(gain);
    gain.connect(masterGain);
    source.start(time);
    source.stop(time + 0.04);
  }

  function getBgmTempo() {
    const tickInterval = getTickInterval();
    const tempoMix = (tickInterval - minMs) / (baseMs - minMs);
    return Math.round(160 - tempoMix * 70);
  }

  function scheduleBgm() {
    if (!bgmRunning || !audioCtx) return;

    const bpm = getBgmTempo();
    const beatSec = 60 / bpm;
    const eighth = beatSec / 2;

    while (arpNextTime < audioCtx.currentTime + LOOK_AHEAD) {
      const step = arpStep % 16;

      if (step === 0 || step === 8) {
        softKick(arpNextTime);
      }

      softHat(arpNextTime, step % 2 === 0 ? 0.025 : 0.012);

      if (step === 0) {
        tone(ARP_NOTES[0], 'sine', 0.04, arpNextTime - audioCtx.currentTime, beatSec * 1.8);
      }

      if (step % 2 === 0) {
        const noteIndex = Math.floor(step / 2) % ARP_NOTES.length;
        const volume = step === 0 ? 0.028 : 0.016;
        tone(ARP_NOTES[noteIndex], 'sine', volume, arpNextTime - audioCtx.currentTime, eighth * 0.65);
      }

      arpStep++;
      arpNextTime += eighth;
    }

    bgmScheduleId = setTimeout(scheduleBgm, SCHEDULE_MS);
  }

  function startBGM() {
    if (!ensureAudio() || bgmRunning) return;

    bgmRunning = true;
    arpStep = 0;
    arpNextTime = audioCtx.currentTime + 0.08;

    bgmAtmosOsc = audioCtx.createOscillator();
    bgmAtmosOsc2 = audioCtx.createOscillator();
    bgmPadGain = audioCtx.createGain();

    const lowPass = audioCtx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 320;

    bgmAtmosOsc.type = 'sine';
    bgmAtmosOsc.frequency.value = 55.0;
    bgmAtmosOsc2.type = 'sine';
    bgmAtmosOsc2.frequency.value = 55.4;
    bgmPadGain.gain.value = 0.022;

    bgmAtmosOsc.connect(lowPass);
    bgmAtmosOsc2.connect(lowPass);
    lowPass.connect(bgmPadGain);
    bgmPadGain.connect(masterGain);
    bgmAtmosOsc.start();
    bgmAtmosOsc2.start();

    scheduleBgm();
  }

  function stopBGM() {
    bgmRunning = false;

    if (bgmScheduleId) {
      clearTimeout(bgmScheduleId);
      bgmScheduleId = null;
    }

    try {
      bgmAtmosOsc.stop();
    } catch (_) {}

    try {
      bgmAtmosOsc2.stop();
    } catch (_) {}

    bgmAtmosOsc = null;
    bgmAtmosOsc2 = null;
    bgmPadGain = null;
  }

  return {
    ensureAudio,
    playEat,
    playGameOverSFX,
    playCountdownTick,
    startBGM,
    stopBGM,
  };
}
