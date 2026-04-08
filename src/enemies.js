// ============================================================
//  enemies.js — 3 enemy types: Archer, Diver, Tank
// ============================================================
import * as THREE from 'three';
import { gsap } from 'gsap';
import { scene, spawnParticles } from './scene.js';
import { arrows, Arrow } from './player.js';
import { state } from './state.js';

// ---- Shared materials (reused across instances) ----------
const MAT = {
  // Farmhand (Scarecrow)
  scarecrowBody: new THREE.MeshStandardMaterial({ color: 0xd4a96a, roughness: 1.0 }), // burlap
  scarecrowHead: new THREE.MeshStandardMaterial({ color: 0xe8c99a, roughness: 1.0 }), // straw face
  scarecrowHat:  new THREE.MeshStandardMaterial({ color: 0x5d3a1a, roughness: 1.0 }), // dark wood hat
  overalls:      new THREE.MeshStandardMaterial({ color: 0x3d6bab, roughness: 0.8 }), // blue overalls
  // Crow
  crowBody:      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }),
  crowBeak:      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.8 }),
  crowWing:      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, side: 2 }),
  // Tractor
  tractorBody:   new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 }), // red tractor
  tractorWheel:  new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 }),
  tractorCabin:  new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.5 }),
  exhaust:       new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }),
  glowRed:       new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6 }),
};

// ============================
//  1. FARMHAND enemy (Scarecrow)
// ============================
export class ArcherEnemy {
  constructor(x, y) {
    this.type      = 'Archer';
    this.isDead    = false;
    this.hp        = 1;
    this.shootTimer = Math.random() * 80;

    this.group = new THREE.Group();

    // Body (burlap shirt)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.1, 6), MAT.scarecrowBody);
    this.group.add(body);

    // Overalls bib
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.1), MAT.overalls);
    bib.position.set(0, 0.1, 0.35);
    this.group.add(bib);

    // Head (straw-stuffed sack)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), MAT.scarecrowHead);
    head.scale.y = 1.1;
    head.position.y = 0.82;
    this.group.add(head);

    // Straw hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.07, 10), MAT.scarecrowHat);
    brim.position.y = 1.0;
    this.group.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.32, 10), MAT.scarecrowHat);
    crown.position.y = 1.22;
    this.group.add(crown);

    // Stick arms (held out wide)
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5);
    [-1, 1].forEach(side => {
      const arm = new THREE.Mesh(armGeo, MAT.scarecrowBody);
      arm.rotation.z = side * Math.PI / 2;
      arm.position.set(side * 0.5, 0.25, 0);
      this.group.add(arm);
    });

    // Pitchfork (instead of bow)
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 5);
    const handle = new THREE.Mesh(handleGeo, MAT.scarecrowHat);
    handle.position.set(0.5, 0.5, 0.3);
    this.group.add(handle);
    // Tines
    [-0.12, 0, 0.12].forEach(ox => {
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 4), MAT.scarecrowHat);
      tine.position.set(0.5 + ox, 1.05, 0.3);
      this.group.add(tine);
    });

    this.group.position.set(x, y, 0);
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update(speed) {
    if (this.isDead) return;
    this.group.position.x -= speed;
    // Slight wobble (scarecrow swaying)
    this.group.rotation.z = Math.sin(Date.now() * 0.003) * 0.08;

    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    this.box.setFromCenterAndSize(pos, new THREE.Vector3(0.9, 1.5, 0.9));

    if (state.enemyTier >= 2) {
      this.shootTimer++;
      if (this.shootTimer > 100) {
        arrows.push(new Arrow(this.group.position.clone()));
        this.shootTimer = 0;
      }
    }
  }

  hit() { this.die(); return true; }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    spawnParticles(this.group.position, 0xd4a96a, 12);
    scene.remove(this.group);
  }

  isOffscreen() { return this.group.position.x < -25; }
  cleanup()     { scene.remove(this.group); }
}

// ============================
//  2. CROW enemy (Diver)
// ============================
export class DiverEnemy {
  constructor(x, targetY) {
    this.type   = 'Diver';
    this.isDead = false;
    this.hp     = 1;
    this.diveAngle = Math.PI * 0.22;

    this.group = new THREE.Group();

    // Crow body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 7, 7), MAT.crowBody);
    body.scale.set(1.4, 1.0, 0.9);
    this.group.add(body);

    // Tail feathers
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 5), MAT.crowBody);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(-0.55, -0.1, 0);
    this.group.add(tail);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), MAT.crowBody);
    head.position.set(0.45, 0.2, 0);
    this.group.add(head);

    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), MAT.crowBeak);
    beak.rotation.z = Math.PI / 2;
    beak.position.set(0.72, 0.2, 0);
    this.group.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.055, 5, 5);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    [-0.08, 0.08].forEach(z => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0.6, 0.28, z);
      this.group.add(eye);
    });

    // Wings (foldable)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-0.8, 0.5);
    wingShape.lineTo(-0.5, 0);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    this.leftWing  = new THREE.Mesh(wingGeo, MAT.crowWing);
    this.rightWing = new THREE.Mesh(wingGeo, MAT.crowWing);
    this.leftWing.position.set(0, 0.1, 0.42);
    this.rightWing.position.set(0, 0.1, -0.42);
    this.rightWing.rotation.y = Math.PI;
    this.group.add(this.leftWing);
    this.group.add(this.rightWing);

    this.group.position.set(x, targetY + 12, 0);
    this.group.rotation.z = this.diveAngle;
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update(speed) {
    if (this.isDead) return;
    this.group.position.x -= speed * 1.4;
    this.group.position.y -= speed * 0.8;

    // Flap wings
    const flap = Math.sin(Date.now() * 0.015) * 0.5;
    this.leftWing.rotation.z  =  flap;
    this.rightWing.rotation.z = -flap;

    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    this.box.setFromCenterAndSize(pos, new THREE.Vector3(1.0, 0.9, 0.9));
  }

  hit() { this.die(); return true; }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    spawnParticles(this.group.position, 0x222222, 14);
    scene.remove(this.group);
  }

  isOffscreen() { return this.group.position.x < -25 || this.group.position.y < -15; }
  cleanup() { scene.remove(this.group); }
}

// ============================
//  3. TRACTOR enemy (Tank)
// ============================
export class TankEnemy {
  constructor(x, y) {
    this.type   = 'Tank';
    this.isDead = false;
    this.hp     = 2;
    this._flashTimeout = null;

    this.group = new THREE.Group();

    // Main tractor body
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.55 })
    );
    bodyMesh.position.y = 0.1;
    this.group.add(bodyMesh);
    this.bodyMat = bodyMesh.material;

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.8, 0.85),
      new THREE.MeshStandardMaterial({ color: 0xdd3333, roughness: 0.5 })
    );
    cabin.position.set(-0.25, 0.9, 0);
    this.group.add(cabin);

    // Cabin windows
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.1, transparent: true, opacity: 0.7 });
    const winFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.6), glassMat);
    winFront.position.set(0.2, 0.9, 0);
    this.group.add(winFront);

    // Exhaust pipe
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6),
      MAT.exhaust
    );
    exhaust.position.set(0.6, 1.35, 0.2);
    this.group.add(exhaust);

    // Big rear wheels (×2)
    const rearWheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 10);
    [-0.55, 0.55].forEach(z => {
      const w = new THREE.Mesh(rearWheelGeo, MAT.tractorWheel);
      w.rotation.x = Math.PI / 2;
      w.position.set(-0.55, -0.35, z);
      this.group.add(w);
    });

    // Small front wheels (×2)
    const frontWheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 8);
    [-0.5, 0.5].forEach(z => {
      const w = new THREE.Mesh(frontWheelGeo, MAT.tractorWheel);
      w.rotation.x = Math.PI / 2;
      w.position.set(0.7, -0.58, z);
      this.group.add(w);
    });

    // Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    [-0.25, 0.25].forEach(z => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), lightMat);
      light.position.set(0.92, 0.2, z);
      this.group.add(light);
    });

    // HP indicator dots (green/red lights on side)
    this.hpDots = [];
    for (let i = 0; i < 2; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x00ff44 })
      );
      dot.position.set(-0.92, 0.3 - i * 0.3, 0.52);
      this.hpDots.push(dot);
      this.group.add(dot);
    }

    this.group.position.set(x, y, 0);
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update(speed) {
    if (this.isDead) return;
    this.group.position.x -= speed * 0.6; // slower — it's a tractor!
    // Slight bounce (driving over bumps)
    this.group.position.y += Math.sin(Date.now() * 0.008) * 0.004;

    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    this.box.setFromCenterAndSize(pos, new THREE.Vector3(1.9, 1.1, 1.1));
  }

  hit() {
    this.hp--;
    this._updateHPDots();

    if (this.hp <= 0) {
      this.die();
      return true; // dead
    }

    // Flash red on 1st hit
    this.bodyMat.emissive = new THREE.Color(0xff2200);
    this.bodyMat.emissiveIntensity = 1.0;
    clearTimeout(this._flashTimeout);
    this._flashTimeout = setTimeout(() => {
      this.bodyMat.emissiveIntensity = 0;
    }, 300);
    return false; // still alive
  }

  _updateHPDots() {
    this.hpDots.forEach((dot, i) => {
      dot.material.color.set(i < this.hp ? 0x00ff44 : 0xff2200);
    });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    spawnParticles(this.group.position, 0xcc2222, 16);
    spawnParticles(this.group.position, 0x444444,  8);
    scene.remove(this.group);
  }

  isOffscreen() { return this.group.position.x < -25; }
  cleanup()     { scene.remove(this.group); }
}

// ---- Enemy factory --------------------------------------
export function spawnEnemy(tier, x, y) {
  const roll = Math.random();

  if (tier === 1) {
    return new ArcherEnemy(x, y);
  } else if (tier === 2) {
    return roll < 0.6 ? new ArcherEnemy(x, y) : new DiverEnemy(x, y);
  } else {
    if (roll < 0.45) return new ArcherEnemy(x, y);
    if (roll < 0.75) return new DiverEnemy(x, y);
    return new TankEnemy(x, y);
  }
}
