// ============================================================
//  state.js — Global game state
// ============================================================
import { COMBO_RESET_MS, COMBO_THRESHOLDS } from './config.js';

export const GameState = {
  MENU:      'MENU',
  PLAYING:   'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

// Mutable game state — mutate properties directly, don't replace the object
export const state = {
  phase:       GameState.MENU,
  score:       0,
  highScore:   parseInt(localStorage.getItem('flappyHighScore') || '0', 10),

  // Combo tracking
  comboKills:       0,   // consecutive kills
  comboMultiplier:  1,   // current multiplier (1, 2, or 3)
  lastKillTime:     0,   // timestamp of last kill for reset timer

  // Difficulty
  pipeSpeed:       0.12,
  spawnInterval:   1400,
  enemyTier:       1,
  difficultyLevel: 0,    // index into DIFFICULTY_TIERS

  // Wave events
  pendingWaveFlash: false,

  // Hit-stop (temporal freeze)
  hitStopTicks: 0,
};

// ---- Combo helpers --------------------------------

/** Call on every enemy kill. Returns the points multiplied. */
export function registerKill(basePoints) {
  const now = Date.now();

  // Reset combo if too long since last kill
  if (now - state.lastKillTime > COMBO_RESET_MS) {
    state.comboKills = 0;
  }

  state.comboKills++;
  state.lastKillTime = now;

  // Determine multiplier
  if (state.comboKills >= COMBO_THRESHOLDS[1]) {
    state.comboMultiplier = 3;
  } else if (state.comboKills >= COMBO_THRESHOLDS[0]) {
    state.comboMultiplier = 2;
  } else {
    state.comboMultiplier = 1;
  }

  const earned = basePoints * state.comboMultiplier;
  state.score += earned;
  return earned;
}

/** Call every frame during PLAYING to auto-reset stale combos. */
export function tickCombo() {
  if (state.comboKills > 0 && Date.now() - state.lastKillTime > COMBO_RESET_MS) {
    state.comboKills = 0;
    state.comboMultiplier = 1;
  }
}

/** Reset all mutable state for a new game. */
export function resetState() {
  state.phase           = GameState.PLAYING;
  state.score           = 0;
  state.comboKills      = 0;
  state.comboMultiplier = 1;
  state.lastKillTime    = 0;
  state.pipeSpeed       = 0.12;
  state.spawnInterval   = 1400;
  state.enemyTier       = 1;
  state.difficultyLevel = 0;
  state.pendingWaveFlash = false;
}

