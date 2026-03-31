// ============================================================
//  level.js — Minaret pipe spawning + difficulty controller
// ============================================================
import * as THREE from 'three';
import { scene } from './scene.js';
import { state } from './state.js';
import { PIPE_GAP } from './config.js';
import { spawnEnemy } from './enemies.js';

export const pipes   = [];
export const enemies = [];
let lastSpawnTime = 0;

// ---- Minaret construction --------------------------------
function createMinaret(isTop) {
  const g = new THREE.Group();
  const stoneMat  = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.9 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, metalness: 0.8, roughness: 0.2 });

  const hatH = 3;
  const hat  = new THREE.Mesh(new THREE.ConeGeometry(1.2, hatH, 16), copperMat);
  hat.position.y = isTop ? hatH / 2 : -hatH / 2;
  if (isTop) hat.rotation.x = Math.PI;
  g.add(hat);

  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.4, 16), stoneMat);
  balcony.position.y = isTop ? hatH + 0.5 : -(hatH + 0.5);
  g.add(balcony);

  const shaftH = 40;
  const shaft  = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, shaftH, 16), stoneMat);
  shaft.position.y = isTop ? hatH + 1 + shaftH / 2 : -(hatH + 1 + shaftH / 2);
  g.add(shaft);

  return g;
}

// ---- Spawn one wave (pipe pair + enemies) ----------------
function spawnWave() {
  const pipeGroup    = new THREE.Group();
  const heightOffset = (Math.random() - 0.5) * 8;

  const top = createMinaret(true);
  top.position.y = heightOffset + PIPE_GAP / 2;
  pipeGroup.add(top);

  const bot = createMinaret(false);
  bot.position.y = heightOffset - PIPE_GAP / 2;
  pipeGroup.add(bot);

  pipeGroup.position.x = 22;
  pipeGroup.userData = { scored: false };
  scene.add(pipeGroup);
  pipes.push(pipeGroup);

  // Spawn 1–2 enemies based on difficulty
  const enemyCount = state.enemyTier >= 3 && Math.random() < 0.3 ? 2 : 1;
  for (let i = 0; i < enemyCount; i++) {
    const yOffset = i === 0 ? heightOffset : heightOffset + (Math.random() - 0.5) * 3;
    enemies.push(spawnEnemy(state.enemyTier, 22, yOffset));
  }
}

// ---- Per-frame update ------------------------------------
export function updateLevel(birdX, pipeSpeed, onPipePass, onDeath) {
  const now = Date.now();

  // Spawn timing
  if (now - lastSpawnTime > state.spawnInterval) {
    spawnWave();
    lastSpawnTime = now;
  }

  // Update pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const pipe = pipes[i];
    pipe.position.x -= pipeSpeed;
    pipe.updateMatrixWorld();

    // Score passage
    if (!pipe.userData.scored && pipe.position.x < birdX) {
      pipe.userData.scored = true;
      onPipePass();
    }

    if (pipe.position.x < -25) {
      scene.remove(pipe);
      pipes.splice(i, 1);
    }
  }
}

// ---- Reset ----------------------------------------------
export function resetLevel() {
  pipes.forEach(p => scene.remove(p));
  pipes.length = 0;
  enemies.forEach(e => e.cleanup());
  enemies.length = 0;
  lastSpawnTime = Date.now();
}
