// ============================================================
//  combat.js — Collision detection & combat resolution
// ============================================================
import * as THREE from 'three';
import { spawnParticles } from './scene.js';
import { spits, arrows }  from './player.js';
import { enemies, pipes } from './level.js';
import { onEnemyKill }    from './scoring.js';
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
    // Only check pipes that are close
    if (Math.abs(pipe.position.x - player.group.position.x) > 4) continue;
    pipe.children.forEach(segment => {
      const pBox = new THREE.Box3().setFromObject(segment);
      if (bodyBox.intersectsBox(pBox)) onDeath('Pipe Collision');
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

    // Body hit = death
    if (bodyBox.intersectsBox(enemy.box)) {
      onDeath('Enemy Collision');
      return; // stop processing — we're dead
    }

    // Sword hit
    if (player.isSwinging && swordBox.intersectsBox(enemy.box)) {
      const dead = enemy.hit();
      if (dead) {
        spawnParticles(enemy.group.position, 0xffd700, 6);
        onEnemyKill(ENEMY_POINTS[enemy.type] ?? 2);
        showHitFlash();
        enemies.splice(i, 1);
      }
      continue; // don't also check offscreen this frame
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
          onEnemyKill(ENEMY_POINTS[enemy.type] ?? 2);
          showHitFlash();
          enemies.splice(j, 1);
        }
        hit = true;
        break;
      }
    }

    // vs arrows (intercept)
    if (!hit) {
      for (let k = arrows.length - 1; k >= 0; k--) {
        if (spit.box.intersectsBox(arrows[k].box)) {
          spawnParticles(arrows[k].group.position, 0x55ff00, 4);
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
