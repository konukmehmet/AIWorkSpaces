// ============================================================
//  ui.js — DOM management: HUD, screens, combo, wave flash
// ============================================================
import { gsap } from 'gsap';
import { state, GameState } from './state.js';

// ---- DOM refs (grabbed once) -----------------------------
const menuScreen     = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hudScore       = document.getElementById('hud-score');
const mobileControls = document.getElementById('mobile-controls');
const finalScoreText = document.getElementById('final-score');
const highScoreText  = document.getElementById('high-score');
const comboDisplay   = document.getElementById('hud-combo');
const comboBarWrap   = document.getElementById('combo-bar-wrap');
const comboBar       = document.getElementById('combo-bar');
const waveFlash      = document.getElementById('wave-flash');

// ---- Screen transitions ----------------------------------
export function showMenu() {
  menuScreen.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');
  hudScore.classList.add('hidden');
  mobileControls.classList.add('hidden');
  if (comboBarWrap) comboBarWrap.classList.add('hidden');
}

export function showPlaying() {
  menuScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hudScore.classList.remove('hidden');
  mobileControls.classList.remove('hidden');
  // combo bar starts hidden until first combo
  if (comboBarWrap) comboBarWrap.classList.add('hidden');
}

export function showGameOver() {
  if (finalScoreText) finalScoreText.textContent = state.score;
  if (highScoreText)  highScoreText.textContent  = state.highScore;
  hudScore.classList.add('hidden');
  mobileControls.classList.add('hidden');
  if (comboBarWrap) comboBarWrap.classList.add('hidden');
  if (comboDisplay) { comboDisplay.textContent = ''; comboDisplay.className = ''; }
  gameOverScreen.classList.remove('hidden');
}

// ---- HUD score -------------------------------------------
export function updateHUD() {
  if (hudScore) hudScore.textContent = state.score;
  _refreshCombo();
}

// ---- Combo display (internal) ----------------------------
function _refreshCombo() {
  if (!comboDisplay) return;

  if (state.comboMultiplier > 1) {
    const label = `COMBO ×${state.comboMultiplier}`;
    if (comboDisplay.textContent !== label) {
      comboDisplay.textContent = label;
      comboDisplay.className   = `combo-active combo-x${state.comboMultiplier}`;
      // Pop-in animation
      gsap.fromTo(comboDisplay, { scale: 1.4 }, { scale: 1.0, duration: 0.25, ease: 'back.out(2)' });
    }
    if (comboBarWrap) comboBarWrap.classList.remove('hidden');
  } else {
    comboDisplay.textContent = '';
    comboDisplay.className   = '';
    if (comboBarWrap) comboBarWrap.classList.add('hidden');
  }
}

// ---- Combo decay bar (called every frame) ----------------
export function tickComboBar() {
  if (!comboBar || !comboBarWrap) return;
  if (state.comboMultiplier <= 1) return;

  const elapsed = Date.now() - state.lastKillTime;
  const pct = Math.max(0, 1 - elapsed / 3000);
  comboBar.style.transform = `scaleX(${pct})`;

  // Auto-hide when bar fully drains
  if (pct === 0 && comboBarWrap) comboBarWrap.classList.add('hidden');
}

// ---- Wave flash ------------------------------------------
const WAVE_LABELS = ['', 'WAVE 1', 'WAVE 2', 'WAVE 3', 'MAX SPEED'];

export function triggerWaveFlash(level) {
  if (!waveFlash) return;
  waveFlash.textContent = WAVE_LABELS[level] ?? `WAVE ${level}`;
  gsap.killTweensOf(waveFlash);
  gsap.fromTo(waveFlash,
    { opacity: 0, scale: 0.65, y: 10 },
    {
      opacity: 1, scale: 1, y: 0,
      duration: 0.35, ease: 'back.out(2)',
      onComplete: () =>
        gsap.to(waveFlash, { opacity: 0, y: -8, delay: 1.2, duration: 0.4 }),
    }
  );
}

/** Show a floating number (+2, etc) at a screen position */
export function showFloatingText(x, y, text, color = '#ffd700') {
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.color = color;
  el.style.left  = `${x}px`;
  el.style.top   = `${y}px`;
  document.body.appendChild(el);

  // Animate: immediately start transition
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(-100px) scale(1.4)';
    el.style.opacity   = '0';
  });

  setTimeout(() => el.remove(), 900);
}
