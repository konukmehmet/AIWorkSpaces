// ============================================================
//  main.js — Entry point: wires all modules into the game loop
// ============================================================
import './style.css';

import { renderer, camera, scene, updateParticles, scrollSkyline, cameraShake } from './scene.js';
import { OttomanBird, spits, arrows }               from './player.js';
import { updateLevel, resetLevel, enemies }          from './level.js';
import { updateCombat }                              from './combat.js';
import { onPipePass }                               from './scoring.js';
import { tickCombo, state, GameState, resetState }  from './state.js';
import {
  showMenu, showPlaying, showGameOver,
  updateHUD, tickComboBar, triggerWaveFlash,
} from './ui.js';
import { initAudio, playGameOver } from './audio.js';

// ---- Player ------------------------------------------------
const bird = new OttomanBird();

// ---- Input cooldown guard ----------------------------------
let inputCooldownUntil = 0;
const INPUT_COOLDOWN_MS = 350;

// ---- Game flow ---------------------------------------------
function startGame() {
  initAudio();
  resetState();
  resetLevel();

  // Clear any lingering projectiles from last run
  [...spits].forEach(s => s.destroy());
  spits.length  = 0;
  [...arrows].forEach(a => a.destroy());
  arrows.length = 0;

  bird.reset();
  showPlaying();
  updateHUD();

  inputCooldownUntil = Date.now() + INPUT_COOLDOWN_MS;
}

function endGame(reason) {
  if (state.phase === GameState.GAME_OVER) return;
  console.log('[Game Over]', reason);
  state.phase = GameState.GAME_OVER;
  playGameOver();

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('flappyHighScore', String(state.highScore));
  }

  cameraShake(0.5, 0.5);
  showGameOver();
}

// ---- Controls ----------------------------------------------
const handleJump   = e => { e?.preventDefault(); e?.stopPropagation(); bird.jump();  };
const handleAttack = e => { e?.preventDefault(); e?.stopPropagation(); bird.swing(); };
const handleSpit   = e => { e?.preventDefault(); e?.stopPropagation(); bird.spit();  };

document.getElementById('start-btn')  .addEventListener('click',       e => { e.stopPropagation(); startGame(); });
document.getElementById('restart-btn').addEventListener('click',       e => { e.stopPropagation(); startGame(); });
document.getElementById('jump-btn')   .addEventListener('pointerdown', handleJump);
document.getElementById('attack-btn') .addEventListener('pointerdown', handleAttack);
document.getElementById('spit-btn')   .addEventListener('pointerdown', handleSpit);

renderer.domElement.addEventListener('pointerdown', () => {
  if (state.phase === GameState.PLAYING && Date.now() > inputCooldownUntil) bird.jump();
});

window.addEventListener('keydown', e => {
  if (state.phase !== GameState.PLAYING || Date.now() <= inputCooldownUntil) return;
  if (e.code === 'Space')   { e.preventDefault(); bird.swing(); }
  if (e.code === 'KeyW' || e.code === 'ArrowUp')                           bird.jump();
  if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') bird.spit();
});

// ---- Main loop ---------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  if (state.phase === GameState.PLAYING) {
      const speed = state.pipeSpeed;

      // 1. Combo decay tick
      tickCombo();

      // 2. Player physics
      bird.update(endGame);

      // 3. Level logic
      updateLevel(bird.group.position.x, speed, onPipePass, endGame);

      // 4. Combat logic
      updateCombat(bird, speed, endGame);

      // 5. Particles
      updateParticles();

      // 6. Background
      scrollSkyline(speed);

      // 7. Dynamic weapon scaling
      bird.updateScale(state.score);

      // 8. HUD & Combo bar
      tickComboBar();

      // 9. Wave flash
      if (state.pendingWaveFlash) {
        state.pendingWaveFlash = false;
        triggerWaveFlash(state.difficultyLevel + 1);
      }

  }

  renderer.render(scene, camera);
}

// Boot
showMenu();
animate();
