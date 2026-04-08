// ============================================================
//  combat.js — Collision detection & combat resolution
// ============================================================
import * as THREE from 'three';
import { spawnParticles, spawnImpactVFX, cameraShake } from './scene.js';
import { spits, arrows }                      from './player.js';
import { enemies, pipes }                     from './level.js';

import { onEnemyKill }                        from './scoring.js';
import { renderer, camera }                   from './scene.js';
import { state }                              from './state.js';
import { showFloatingText }                   from './ui.js';
import {
  SCORE_ARCHER_KILL,
  SCORE_DIVER_KILL,
  SCORE_TANK_KILL,
} from './config.js';

const ENEMY_POINTS = {
  Archer: SCORE_ARCHER_KILL,
  Diver:  SCORE_DIVER_KILL,
  Tank:   SCORE_TANK_KILL,
};

// Reusable Box3 to avoid GC pressure
const _pipeBox = new THREE.Box3();

// ---- Main collision pass (called every PLAYING frame) -----
// speed: current pipeSpeed from state
export function updateCombat(player, speed, onDeath) {
  const bodyBox  = player.getBodyBox();
  const swordBox = player.getSwordBox();

  _checkPipes(player, bodyBox, onDeath);
  _checkEnemies(player, speed, bodyBox, swordBox, onDeath);
  _checkArrows(player, bodyBox, swordBox, onDeath);
  _checkSpits();
}

// ---- 1. Pipe collision ------------------------------------
function _checkPipes(player, bodyBox, onDeath) {
  for (const pipe of pipes) {
    if (Math.abs(pipe.position.x - player.group.position.x) > 4) continue;
    pipe.children.forEach(segment => {
      _pipeBox.setFromObject(segment); // reuse, no GC
      if (bodyBox.intersectsBox(_pipeBox)) onDeath('Pipe Collision');
    });
  }
}

// ---- 2. Enemy collision + combat --------------------------
function _checkEnemies(player, speed, bodyBox, swordBox, onDeath) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (enemy.isDead) { enemies.splice(i, 1); continue; }

    // Move enemy this frame
    enemy.update(speed);

    // Sword hit
    if (player.isSwinging && swordBox.intersectsBox(enemy.box)) {
      const dead = enemy.hit();
      
      // JUICE: Impact recoil
      if (enemy.type === 'Tank') {
        player.velocity = 0.12; // BUG FIX: positive = upward jolt
        cameraShake(0.4, 0.3);
      } else {
        cameraShake(0.15, 0.2);
      }

      if (dead) {
        _handleKill(enemy);
        enemies.splice(i, 1);
      }
      continue;
    }

    // Body hit = death
    if (bodyBox.intersectsBox(enemy.box)) {
      onDeath('Enemy Collision');
      return; // stop processing — we're dead
    }


    // Cull offscreen enemies
    if (enemy.isOffscreen()) {
      enemy.cleanup();
      enemies.splice(i, 1);
    }
  }
}

// ---- 3. Arrow updates & player hit ------------------------
function _checkArrows(player, bodyBox, swordBox, onDeath) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    if (!arrow.update()) { arrows.splice(i, 1); continue; }

    // Arrow hits player body
    if (bodyBox.intersectsBox(arrow.box)) {
      arrow.destroy();
      arrows.splice(i, 1);
      onDeath('Arrow Hit');
      return;
    }

    // Arrow deflected by swinging sword
    if (player.isSwinging && swordBox.intersectsBox(arrow.box)) {
      spawnParticles(arrow.group.position, 0xffffff, 5);
      arrow.destroy();
      arrows.splice(i, 1);
    }
  }
}

// ---- 4. Spit vs enemies & arrows -------------------------
function _checkSpits() {
  for (let i = spits.length - 1; i >= 0; i--) {
    const spit = spits[i];
    if (!spit.update()) { spits.splice(i, 1); continue; }

    let hit = false;

    // vs enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (!enemy.isDead && spit.box.intersectsBox(enemy.box)) {
        const dead = enemy.hit();
        if (dead) {
          // BUG FIX: full kill feedback for spit (was missing VFX/text/shake)
          spawnImpactVFX(enemy.group.position);
          spawnParticles(enemy.group.position, 0x55ff00, 10);
          cameraShake(0.12, 0.15);
          const earned = onEnemyKill(ENEMY_POINTS[enemy.type] ?? 2);
          showHitFlash();
          // Floating text
          const vec = enemy.group.position.clone().project(camera);
          const x = (vec.x + 1) * renderer.domElement.width  / 2;
          const y = (-vec.y + 1) * renderer.domElement.height / 2;
          const comboLabel = state.comboMultiplier > 1 ? ` (x${state.comboMultiplier})` : '';
          showFloatingText(x, y, `+${earned}${comboLabel}`, '#55ff00');
          enemies.splice(j, 1);
        } else {
          // Tank survives — still show a hit effect
          cameraShake(0.08, 0.1);
          showHitFlash();
          onEnemyKill(0); // update HUD combo timer but no points
        }
        hit = true;
        break;
      }
    }

    // vs arrows (intercept)
    if (!hit) {
      for (let k = arrows.length - 1; k >= 0; k--) {
        if (spit.box.intersectsBox(arrows[k].box)) {
          // BUG FIX: reward arrow intercept with a flash + text
          const arrowPos = arrows[k].group.position.clone();
          spawnParticles(arrowPos, 0x55ff00, 4);
          showHitFlash();
          const vec = arrowPos.clone().project(camera);
          const x = (vec.x + 1) * renderer.domElement.width  / 2;
          const y = (-vec.y + 1) * renderer.domElement.height / 2;
          showFloatingText(x, y, 'BLOCK!', '#55ff00');
          arrows[k].destroy();
          arrows.splice(k, 1);
          hit = true;
          break;
        }
      }
    }

    if (hit) { spit.destroy(); spits.splice(i, 1); }
  }
}

// ---- Internals for juicy kills --------------------------

function _handleKill(enemy) {
  // 1. Effects
  spawnImpactVFX(enemy.group.position);
  spawnParticles(enemy.group.position, 0xffd700, 8);
  showHitFlash();

  // 2. Score & Combo
  const earned = onEnemyKill(ENEMY_POINTS[enemy.type] ?? 2);

  // 3. Floating Text
  const vector = enemy.group.position.clone().project(camera);
  const x = (vector.x + 1) * renderer.domElement.width / 2;
  const y = (-vector.y + 1) * renderer.domElement.height / 2;
  
  const comboLabel = state.comboMultiplier > 1 ? ` (x${state.comboMultiplier})` : '';
  showFloatingText(x, y, `+${earned}${comboLabel}`);
}

// ---- White hit-flash overlay (on kill) -------------------
let _flashEl = null;
let _flashTimeout = null;

function showHitFlash() {
  if (!_flashEl) {
    _flashEl = document.createElement('div');
    Object.assign(_flashEl.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(255,255,255,0)',
      pointerEvents: 'none',
      zIndex: '999',
      transition: 'background 0.08s ease',
    });
    document.body.appendChild(_flashEl);
  }
  clearTimeout(_flashTimeout);
  _flashEl.style.background = 'rgba(255,255,255,0.22)';
  _flashTimeout = setTimeout(() => {
    _flashEl.style.background = 'rgba(255,255,255,0)';
  }, 80);
}
