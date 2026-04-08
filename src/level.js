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

// ---- Farm Fence/Haybale obstacle construction -----------
function createFarmObstacle(isTop) {
  const g = new THREE.Group();

  // Materials
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 1.0 });
  const hayMat  = new THREE.MeshStandardMaterial({ color: 0xe8b84b, roughness: 0.95, flatShading: true });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6d4c1f, roughness: 1.0 });

  // Long wooden shaft (fence post stack)
  const shaftH = 40;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, shaftH, 8), woodMat);
  shaft.position.y = isTop ? shaftH / 2 : -shaftH / 2;
  g.add(shaft);

  // Cross-planks for fence feel
  [-4, -2, 0, 2, 4].forEach(offset => {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 0.4), postMat);
    plank.position.y = isTop ? offset + 1 : -offset - 1;
    g.add(plank);
  });

  // Haybale cluster at the tip
  const baleGeo = new THREE.IcosahedronGeometry(1.5, 0);
  const bale = new THREE.Mesh(baleGeo, hayMat);
  bale.position.y = isTop ? 1.5 : -1.5;
  g.add(bale);

  // Smaller bales beside main one
  const smallBaleGeo = new THREE.IcosahedronGeometry(0.9, 0);
  [-1.2, 1.2].forEach(xOff => {
    const sb = new THREE.Mesh(smallBaleGeo, hayMat);
    sb.position.set(xOff, isTop ? 0.5 : -0.5, 0.2);
    g.add(sb);
  });

  return g;
}

// ---- Spawn one wave (pipe pair + enemies) ----------------
function spawnWave() {
  const pipeGroup    = new THREE.Group();
  const heightOffset = (Math.random() - 0.5) * 8;

  const top = createFarmObstacle(true);
  top.position.y = heightOffset + PIPE_GAP / 2;
  pipeGroup.add(top);

  const bot = createFarmObstacle(false);
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
