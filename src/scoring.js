// ============================================================
//  scoring.js — Score/combo helpers + difficulty scaling
// ============================================================
import { state, registerKill } from './state.js';
import { DIFFICULTY_TIERS, SCORE_PIPE_PASS } from './config.js';
import { updateHUD } from './ui.js';
import { playScore } from './audio.js';

/** Called each time the player passes a pipe. */
export function onPipePass() {
  state.score += SCORE_PIPE_PASS;
  playScore();
  checkDifficultyScale();
  updateHUD();
}

/** Called each time an enemy dies. */
export function onEnemyKill(basePoints) {
  const earned = registerKill(basePoints);
  playScore();
  checkDifficultyScale();
  updateHUD();
  return earned;
}

/** Advance difficulty tier if score crosses a threshold. */
function checkDifficultyScale() {
  const tiers = DIFFICULTY_TIERS;
  let nextLevel = state.difficultyLevel;

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (state.score >= tiers[i].score) {
      nextLevel = i;
      break;
    }
  }

  if (nextLevel !== state.difficultyLevel) {
    state.difficultyLevel = nextLevel;
    const tier = tiers[nextLevel];
    state.pipeSpeed     = tier.speed;
    state.spawnInterval = tier.spawnInterval;
    state.enemyTier     = tier.enemyTier;
    state.pendingWaveFlash = true; // signal UI to flash wave label
  }
}
