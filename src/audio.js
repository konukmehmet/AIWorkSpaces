// ============================================================
//  audio.js — Procedural Web Audio API Sound Effects
// ============================================================

let audioCtx = null;
let masterGain = null;

export function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5; // Master volume
  masterGain.connect(audioCtx.destination);
}

// Ensure context is running (fixes browser autoplay policies if resumed later)
function resumeCtx() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// -------------------------------------------------------------
// Effect: Jump (Sweep up)
// -------------------------------------------------------------
export function playJump() {
  if (!audioCtx) return;
  resumeCtx();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  // Sweep frequency from 150 to 600 Hz over 0.2 seconds
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.2);
  
  // Volume envelope
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

// -------------------------------------------------------------
// Effect: Weapon Swing (Quick whoosh)
// -------------------------------------------------------------
export function playSwing() {
  if (!audioCtx) return;
  resumeCtx();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

// -------------------------------------------------------------
// Effect: Spit (High blip)
// -------------------------------------------------------------
export function playSpit() {
  if (!audioCtx) return;
  resumeCtx();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// -------------------------------------------------------------
// Effect: Hit / Kill / Explosion (Noise burst)
// -------------------------------------------------------------
export function playHit() {
  if (!audioCtx) return;
  resumeCtx();
  
  // Create noise buffer
  const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 seconds
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
  filter.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  
  noiseSource.start();
}

// -------------------------------------------------------------
// Effect: Score (Coin ping)
// -------------------------------------------------------------
export function playScore() {
  if (!audioCtx) return;
  resumeCtx();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
  osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.08); // E6
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// -------------------------------------------------------------
// Effect: Game Over (Descending notes)
// -------------------------------------------------------------
export function playGameOver() {
  if (!audioCtx) return;
  resumeCtx();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.8);
  
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 1.0);
}
