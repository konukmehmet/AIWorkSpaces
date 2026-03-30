import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';

// --- Game Constants ---
const GRAVITY = -0.007;
const JUMP_STRENGTH = 0.18;
const PIPE_SPEED = 0.12;
const PIPE_SPAWN_INTERVAL = 1400; // ms
const PIPE_GAP = 9.0; // Slightly larger for combat room
const BIRD_X = -5;

// --- Game State ---
const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER'
};

let currentGameState = GameState.MENU;
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // Deep night sky
scene.fog = new THREE.Fog(0x3d1b3d, 10, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app').appendChild(renderer.domElement);

// --- Lighting (Warm Bosphorus Sunset) ---
const ambientLight = new THREE.AmbientLight(0xffccaa, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffaa00, 1.5);
sunLight.position.set(10, 10, -10);
scene.add(sunLight);

// --- Particle System (Blood) ---
const particles = [];
class BloodParticle {
  constructor(position) {
    const geo = new THREE.SphereGeometry(0.1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.2,
      (Math.random() - 0.5) * 0.2
    );
    this.gravity = -0.005;
    this.life = 1.0;
    scene.add(this.mesh);
  }

  update() {
    this.velocity.y += this.gravity;
    this.mesh.position.add(this.velocity);
    this.life -= 0.02;
    this.mesh.scale.setScalar(this.life);
    if (this.life <= 0) {
      scene.remove(this.mesh);
      return false;
    }
    return true;
  }
}

// --- Enemy Class ---
class Enemy {
  constructor(parentPosition, heightOffset) {
    this.group = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334455 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(this.body);

    // Head with Fes
    const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xeebb99 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.8;
    this.group.add(head);

    const fesGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.2, 8);
    const fesMat = new THREE.MeshStandardMaterial({ color: 0x990000 });
    const fes = new THREE.Mesh(fesGeo, fesMat);
    fes.position.y = 1.0;
    this.group.add(fes);

    // Enemy Sword
    const swordGeo = new THREE.BoxGeometry(0.1, 1.0, 0.1);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
    this.sword = new THREE.Mesh(swordGeo, swordMat);
    this.sword.position.set(0.5, 0, 0);
    this.sword.rotation.z = -Math.PI / 4;
    this.group.add(this.sword);

    this.group.position.set(22, heightOffset, 0);
    scene.add(this.group);
    
    this.isDead = false;
  }

  die() {
    this.isDead = true;
    for (let i = 0; i < 15; i++) {
      particles.push(new BloodParticle(this.group.position));
    }
    scene.remove(this.group);
  }

  update(speed) {
    this.group.position.x -= speed;
  }
}

// --- Background ---
function createSkyline() {
  const skylineGroup = new THREE.Group();
  for (let i = 0; i < 15; i++) {
    const domeGeo = new THREE.SphereGeometry(2 + Math.random() * 2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const dome = new THREE.Mesh(domeGeo, stoneMat);
    dome.position.set((Math.random() - 0.5) * 100, -10, -30 - Math.random() * 20);
    skylineGroup.add(dome);

    const minGeo = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
    const min = new THREE.Mesh(minGeo, stoneMat);
    min.position.copy(dome.position);
    min.position.x += (Math.random() - 0.5) * 5;
    min.position.y += 5;
    skylineGroup.add(min);
  }
  scene.add(skylineGroup);
  return skylineGroup;
}
const skyline = createSkyline();

// --- Ottoman Rider (Bird on Horse) ---
class OttomanBird {
  constructor() {
    this.group = new THREE.Group();
    
    // --- Horse ---
    this.horseGroup = new THREE.Group();
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x512e10 }); // Brown Stallion
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Horse Body
    const hBodyGeo = new THREE.BoxGeometry(1.2, 0.8, 0.6);
    const hBody = new THREE.Mesh(hBodyGeo, horseMat);
    this.horseGroup.add(hBody);

    // Horse Neck & Head
    const hNeckGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    const hNeck = new THREE.Mesh(hNeckGeo, horseMat);
    hNeck.position.set(0.6, 0.5, 0);
    hNeck.rotation.z = -0.4;
    this.horseGroup.add(hNeck);

    const hHeadGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
    const hHead = new THREE.Mesh(hHeadGeo, horseMat);
    hHead.position.set(0.8, 0.8, 0);
    this.horseGroup.add(hHead);

    // Horse Legs
    const hLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6);
    const createLeg = (x, z) => {
      const leg = new THREE.Mesh(hLegGeo, horseMat);
      leg.position.set(x, -0.7, z);
      this.horseGroup.add(leg);
    };
    createLeg(0.4, 0.2); createLeg(0.4, -0.2);
    createLeg(-0.4, 0.2); createLeg(-0.4, -0.2);

    this.horseGroup.position.y = -0.5;
    this.group.add(this.horseGroup);

    // --- Rider (The Bird) ---
    this.riderGroup = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.6, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeebb00 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.riderGroup.add(this.body);

    // Beak
    const beakGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    this.beak = new THREE.Mesh(beakGeo, beakMat);
    this.beak.position.set(0.4, -0.1, 0);
    this.riderGroup.add(this.beak);

    // Fes
    const fesGroup = new THREE.Group();
    const fesGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16);
    const fesMat = new THREE.MeshStandardMaterial({ color: 0x990000 });
    const fes = new THREE.Mesh(fesGeo, fesMat);
    fesGroup.add(fes);
    
    const tasselGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2);
    const tasselMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const tassel = new THREE.Mesh(tasselGeo, tasselMat);
    tassel.position.set(0, 0.15, 0.1);
    tassel.rotation.x = Math.PI / 4;
    fesGroup.add(tassel);
    fesGroup.position.set(0, 0.45, 0);
    this.riderGroup.add(fesGroup);

    // Mustache
    const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const mustacheGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI);
    const leftMustache = new THREE.Mesh(mustacheGeo, mustacheMat);
    leftMustache.position.set(0.35, -0.15, 0.08);
    leftMustache.rotation.z = Math.PI;
    this.riderGroup.add(leftMustache);

    const rightMustache = new THREE.Mesh(mustacheGeo, mustacheMat);
    rightMustache.position.set(0.35, -0.15, -0.08);
    rightMustache.rotation.z = Math.PI;
    this.riderGroup.add(rightMustache);

    // WHITE Spear (Mızrak)
    const swordHandleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    const swordHandleMat = new THREE.MeshStandardMaterial({ color: 0x442200 });
    const swordBladeGeo = new THREE.BoxGeometry(0.06, 2.5, 0.1); // Much longer blade (Spear style)
    const swordBladeMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, // Pure White
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.1 
    });
    
    this.swordGroup = new THREE.Group();
    const handle = new THREE.Mesh(swordHandleGeo, swordHandleMat);
    const blade = new THREE.Mesh(swordBladeGeo, swordBladeMat);
    blade.position.y = 1.4; // Positioned further out
    this.swordGroup.add(handle);
    this.swordGroup.add(blade);
    this.swordGroup.position.set(0.7, -0.1, 0.4);
    this.swordGroup.rotation.z = -Math.PI / 2;
    this.riderGroup.add(this.swordGroup);

    // Bird Wings (now arms)
    const wingGeo = new THREE.BoxGeometry(0.4, 0.05, 0.4);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xddcc00 });
    this.leftWing = new THREE.Mesh(wingGeo, wingMat);
    this.leftWing.position.set(-0.1, 0, 0.35);
    this.riderGroup.add(this.leftWing);

    this.rightWing = new THREE.Mesh(wingGeo, wingMat);
    this.rightWing.position.set(-0.1, 0, -0.35);
    this.riderGroup.add(this.rightWing);

    this.riderGroup.position.y = 0.4;
    this.group.add(this.riderGroup);

    this.group.position.set(BIRD_X, 3, 0);
    scene.add(this.group);

    this.velocity = 0;
    this.isSwinging = false;
  }

  jump() {
    this.velocity = JUMP_STRENGTH;
    gsap.to(this.leftWing.rotation, { z: 0.6, duration: 0.1, yoyo: true, repeat: 1 });
    gsap.to(this.rightWing.rotation, { z: 0.6, duration: 0.1, yoyo: true, repeat: 1 });
  }

  swing() {
    if (this.isSwinging) return;
    this.isSwinging = true;
    gsap.to(this.swordGroup.rotation, {
      z: Math.PI / 4,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => { this.isSwinging = false; }
    });
  }

  update() {
    if (currentGameState === GameState.PLAYING) {
      this.velocity += GRAVITY;
      this.group.position.y += this.velocity;
      this.group.rotation.z = Math.max(-0.4, Math.min(0.2, this.velocity * 2));
      if (this.group.position.y < -8.5) endGame("Ground Hit");
      if (this.group.position.y > 15) endGame("Ceiling Hit");
    }
  }

  reset() {
    this.group.position.set(BIRD_X, 3, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocity = 0;
    this.isSwinging = false;
    this.group.updateMatrixWorld();
  }
}

const bird = new OttomanBird();

// --- Level Generation ---
const pipes = [];
const enemies = [];
let lastPipeSpawnTime = 0;

function spawnMinaret() {
  const pipeGroup = new THREE.Group();
  const heightOffset = (Math.random() - 0.5) * 8;
  
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.9 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, metalness: 0.8, roughness: 0.2 });

  const createMinaret = (isTop) => {
    const g = new THREE.Group();
    const hatHeight = 3;
    const hatGeo = new THREE.ConeGeometry(1.2, hatHeight, 16);
    const hat = new THREE.Mesh(hatGeo, copperMat);
    hat.position.y = isTop ? hatHeight / 2 : -hatHeight / 2;
    if (isTop) hat.rotation.x = Math.PI;
    g.add(hat);

    const balconyGeo = new THREE.CylinderGeometry(1.4, 1.2, 0.4, 16);
    const balcony = new THREE.Mesh(balconyGeo, stoneMat);
    balcony.position.y = isTop ? hatHeight + 0.5 : -(hatHeight + 0.5);
    g.add(balcony);

    const shaftHeight = 40;
    const shaftGeo = new THREE.CylinderGeometry(1, 1, shaftHeight, 16);
    const shaft = new THREE.Mesh(shaftGeo, stoneMat);
    shaft.position.y = isTop ? hatHeight + 1 + shaftHeight / 2 : -(hatHeight + 1 + shaftHeight / 2);
    g.add(shaft);
    return g;
  };

  const topMinaret = createMinaret(true);
  topMinaret.position.y = heightOffset + PIPE_GAP / 2;
  pipeGroup.add(topMinaret);

  const bottomMinaret = createMinaret(false);
  bottomMinaret.position.y = heightOffset - PIPE_GAP / 2;
  pipeGroup.add(bottomMinaret);

  pipeGroup.position.x = 22;
  pipeGroup.userData = { scored: false };
  
  scene.add(pipeGroup);
  pipes.push(pipeGroup);

  // Spawn Enemy in gap
  enemies.push(new Enemy(22, heightOffset));
}

function updateLevel() {
  const birdBodyBox = new THREE.Box3();
  const birdSwordBox = new THREE.Box3();
  bird.group.updateMatrixWorld();
  
  const birdPos = new THREE.Vector3();
  bird.group.getWorldPosition(birdPos);
  // Hitbox that covers horse and rider
  birdBodyBox.setFromCenterAndSize(birdPos, new THREE.Vector3(1.2, 1.8, 0.7));
  
  // Spear hitbox - expanded for long reach
  const swordPos = new THREE.Vector3();
  bird.swordGroup.getWorldPosition(swordPos);
  birdSwordBox.setFromCenterAndSize(swordPos, new THREE.Vector3(2.8, 1.5, 1.2));

  // Update Pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const pipe = pipes[i];
    pipe.position.x -= PIPE_SPEED;
    pipe.updateMatrixWorld();

    if (!pipe.userData.scored && pipe.position.x < bird.group.position.x) {
      pipe.userData.scored = true;
      score++;
      updateHUD();
    }

    if (Math.abs(pipe.position.x - bird.group.position.x) < 3) {
      pipe.children.forEach(m => {
        const pipeBox = new THREE.Box3().setFromObject(m);
        if (birdBodyBox.intersectsBox(pipeBox)) endGame("Pipe Collision");
      });
    }

    if (pipe.position.x < -25) {
      scene.remove(pipe);
      pipes.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (enemy.isDead) {
      enemies.splice(i, 1);
      continue;
    }
    enemy.update(PIPE_SPEED);
    enemy.group.updateMatrixWorld();

    const enemyBox = new THREE.Box3().setFromObject(enemy.group);

    // Combat Collision
    if (bird.isSwinging && birdSwordBox.intersectsBox(enemyBox)) {
      enemy.die();
      score += 2; // Bonus points for kill
      updateHUD();
    } else if (birdBodyBox.intersectsBox(enemyBox)) {
      endGame("Enemy Collision");
    }

    if (enemy.group.position.x < -25) {
      scene.remove(enemy.group);
      enemies.splice(i, 1);
    }
  }

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update()) {
      particles.splice(i, 1);
    }
  }

  if (Date.now() - lastPipeSpawnTime > PIPE_SPAWN_INTERVAL) {
    spawnMinaret();
    lastPipeSpawnTime = Date.now();
  }
}

// --- UI & Controls ---
const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hudScore = document.getElementById('hud-score');
const finalScoreText = document.getElementById('final-score');
const highScoreText = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

function startGame() {
  currentGameState = GameState.PLAYING;
  score = 0;
  updateHUD();
  menuScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hudScore.classList.remove('hidden');
  bird.reset();
  pipes.forEach(p => scene.remove(p));
  pipes.length = 0;
  enemies.forEach(e => scene.remove(e.group));
  enemies.length = 0;
  lastPipeSpawnTime = Date.now();
}

function endGame(reason) {
  if (currentGameState === GameState.GAME_OVER) return;
  console.log("Game Over! Reason:", reason);
  currentGameState = GameState.GAME_OVER;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyHighScore', highScore);
  }
  finalScoreText.textContent = score;
  highScoreText.textContent = highScore;
  hudScore.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
}

function updateHUD() {
  hudScore.textContent = score;
}

startBtn.addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
restartBtn.addEventListener('click', (e) => { e.stopPropagation(); startGame(); });

window.addEventListener('keydown', (e) => {
  if (currentGameState !== GameState.PLAYING) return;
  if (e.code === 'Space') bird.swing();
  if (e.code === 'KeyW' || e.code === 'ArrowUp') bird.jump();
});

renderer.domElement.addEventListener('mousedown', () => {
  if (currentGameState === GameState.PLAYING) bird.jump();
});

renderer.domElement.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (currentGameState === GameState.PLAYING) bird.jump();
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main Loop ---
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  if (currentGameState === GameState.PLAYING) {
    updateLevel();
    skyline.children.forEach(obj => {
      obj.position.x -= PIPE_SPEED * 0.1;
      if (obj.position.x < -60) obj.position.x = 60;
    });
  }
  bird.update();
  renderer.render(scene, camera);
}
animate();
