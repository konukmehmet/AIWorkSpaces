// ============================================================
//  scene.js — Three.js scene, camera, renderer, lighting, bg
// ============================================================
import * as THREE from 'three';

// ---- Core setup ----------------------------------------
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // light sky blue
scene.fog = new THREE.Fog(0x87ceeb, 20, 80);

export const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 2, 12);
camera.lookAt(0, 0, 0);

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

// ---- Lighting ------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Bright daylight
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
sunLight.position.set(10, 15, 10); // Sun from above/side
scene.add(sunLight);

// Soft fill light
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
fillLight.position.set(-10, 5, -5);
scene.add(fillLight);

// ---- Particles -----------------------------------------
export const particles = [];

export class SparkParticle {
  constructor(position, color = 0xffcc00) {
    const geo = new THREE.SphereGeometry(0.06, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.3
    );
    this.life = 1.0;
    scene.add(this.mesh);
  }
  update() {
    this.mesh.position.add(this.velocity);
    this.velocity.y -= 0.01; // slight gravity on sparks
    this.life -= 0.04;
    this.mesh.scale.setScalar(this.life);
    if (this.life <= 0) { scene.remove(this.mesh); return false; }
    return true;
  }
}

export function spawnParticles(position, color, count = 15) {
  for (let i = 0; i < count; i++) particles.push(new SparkParticle(position, color));
}

/** Radial burst of white particles on impact */
export function spawnImpactVFX(position) {
  for (let i = 0; i < 12; i++) {
    const p = new SparkParticle(position, 0xffffff);
    p.velocity.multiplyScalar(2.0); // Make them move fast
    p.life = 0.8;
    particles.push(p);
  }
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update()) particles.splice(i, 1);
  }
}

// ---- Background skyline --------------------------------
function createSkyline() {
  const g = new THREE.Group();
  for (let i = 0; i < 20; i++) {
    // Generate trees/hills for the farm background
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d8a2d, roughness: 0.9, flatShading: true });
    const trunkMat  = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });

    const scale = 1 + Math.random() * 2;
    // Tree top (leaves)
    const domeGeo = new THREE.IcosahedronGeometry(2 * scale, 0);
    const dome = new THREE.Mesh(domeGeo, leavesMat);
    dome.position.set((Math.random() - 0.5) * 120, -5 + scale, -30 - Math.random() * 20);
    g.add(dome);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 8 * scale, 5);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.copy(dome.position);
    trunk.position.y -= 4 * scale;
    g.add(trunk);
  }
  scene.add(g);
  return g;
}
export const skyline = createSkyline();

export function scrollSkyline(pipeSpeed) {
  skyline.children.forEach(obj => {
    obj.position.x -= pipeSpeed * 0.1;
    if (obj.position.x < -60) obj.position.x = 60;
  });
}

// ---- Camera shake (screen shake on death) --------------
import { gsap } from 'gsap';
let shaking = false;
/** Energetic camera shake for different impact levels */
export function cameraShake(intensity = 0.3, duration = 0.3) {
  if (shaking) return;
  shaking = true;
  const origin = { x: camera.position.x, y: camera.position.y };
  
  gsap.to(camera.position, {
    x: origin.x + (Math.random() - 0.5) * intensity,
    y: origin.y + (Math.random() - 0.5) * intensity,
    duration: duration / 6,
    yoyo: true,
    repeat: 5,
    ease: 'power2.inOut',
    onComplete: () => {
      camera.position.x = origin.x;
      camera.position.y = origin.y;
      shaking = false;
    }
  });
}

// ---- Resize handler ------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
