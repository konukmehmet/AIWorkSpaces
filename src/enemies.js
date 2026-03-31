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
  janissaryBlue: new THREE.MeshStandardMaterial({ color: 0x2244aa }),
  skin:          new THREE.MeshStandardMaterial({ color: 0xeebb99 }),
  red:           new THREE.MeshStandardMaterial({ color: 0x990000 }),
  wood:          new THREE.MeshStandardMaterial({ color: 0x5c4033 }),
  darkGray:      new THREE.MeshStandardMaterial({ color: 0x3a3a3a }),
  gold:          new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 }),
  divGreen:      new THREE.MeshStandardMaterial({ color: 0x115511 }),
  tankBrown:     new THREE.MeshStandardMaterial({ color: 0x4a2a0a }),
  armorGray:     new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6 }),
  glowRed:       new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6 }),
};

// ---- Build a simple humanoid body -----------------------
function buildHumanoid(bodyColor, headColor, hatColor) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: bodyColor }));
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshStandardMaterial({ color: headColor }));
  head.position.y = 0.85;
  g.add(head);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: hatColor }));
  hat.position.y = 1.05;
  g.add(hat);

  return g;
}

// ============================
//  1. ARCHER enemy
// ============================
export class ArcherEnemy {
  constructor(x, y) {
    this.type      = 'Archer';
    this.isDead    = false;
    this.hp        = 1;
    this.shootTimer = Math.random() * 80;

    this.group = buildHumanoid(0x2244aa, 0xeebb99, 0x990000);

    // Bow
    const bow = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.03, 8, 16, Math.PI), MAT.wood);
    bow.position.set(0.4, 0.1, 0);
    bow.rotation.z = -Math.PI / 2;
    this.group.add(bow);

    this.group.position.set(x, y, 0);
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update(speed) {
    if (this.isDead) return;
    this.group.position.x -= speed;
    this.group.updateMatrixWorld();
    this.box.setFromObject(this.group);

    // Fire arrows only at difficulty tier >= 2
    if (state.enemyTier >= 2) {
      this.shootTimer++;
      if (this.shootTimer > 100) {
        arrows.push(new Arrow(this.group.position.clone()));
        this.shootTimer = 0;
      }
    }
  }

  hit() {
    this.die();
    return true; // dead after 1 hit
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    spawnParticles(this.group.position, 0x2244aa, 12);
    scene.remove(this.group);
  }

  isOffscreen() { return this.group.position.x < -25; }
  cleanup()     { scene.remove(this.group); }
}

// ============================
//  2. DIVER enemy
// ============================
export class DiverEnemy {
  constructor(x, targetY) {
    this.type   = 'Diver';
    this.isDead = false;
    this.hp     = 1;
    // Dives from above at 45°
    this.diveAngle = Math.PI * 0.22; // radians from horizontal

    this.group = buildHumanoid(0x115511, 0xeebb99, 0x2a6a2a);

    // Wings for the diver
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1a7a1a, transparent: true, opacity: 0.7 });
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.5), wingMat);
      wing.position.set(0, 0.2, side * 0.65);
      wing.rotation.z = side * 0.3;
      this.group.add(wing);
    });

    // Start high, dive toward target
    this.group.position.set(x, targetY + 12, 0);
    this.group.rotation.z = this.diveAngle; // tilted nose-down
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update(speed) {
    if (this.isDead) return;
    // Move left + down (dive)
    this.group.position.x -= speed * 1.4;
    this.group.position.y -= speed * 0.8;
    // Flap wings
    this.group.children.forEach((c, i) => {
      if (i > 2) c.rotation.z += Math.sin(Date.now() * 0.01) * 0.05;
    });
    this.group.updateMatrixWorld();
    this.box.setFromObject(this.group);
  }

  hit() {
    this.die();
    return true;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    spawnParticles(this.group.position, 0x22aa22, 14);
    scene.remove(this.group);
  }

  isOffscreen() {
    return this.group.position.x < -25 || this.group.position.y < -15;
  }
  cleanup() { scene.remove(this.group); }
}

// ============================
//  3. TANK enemy
// ============================
export class TankEnemy {
  constructor(x, y) {
    this.type   = 'Tank';
    this.isDead = false;
    this.hp     = 2;
    this._flashTimeout = null;

    this.group = new THREE.Group();

    // Big armored body
    const armorBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6, roughness: 0.4 })
    );
    this.group.add(armorBody);
    this.armorMat = armorBody.material;

    // Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.8 })
    );
    helmet.position.y = 1.1;
    this.group.add(helmet);

    // Visor
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.5 })
    );
    visor.position.set(0.4, 1.1, 0);
    this.group.add(visor);

    // Shield
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.2, 0.9),
      MAT.armorGray
    );
    shield.position.set(0.55, 0, 0);
    this.group.add(shield);

    // HP indicator dots
    this.hpDots = [];
    for (let i = 0; i < 2; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x00ff44 })
      );
      dot.position.set(-0.6, 0.5 - i * 0.35, 0.45);
      this.hpDots.push(dot);
      this.group.add(dot);
    }

    this.group.position.set(x, y, 0);
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update(speed) {
    if (this.isDead) return;
    this.group.position.x -= speed * 0.6; // slower
    this.group.updateMatrixWorld();
    this.box.setFromObject(this.group);
  }

  hit() {
    this.hp--;
    this._updateHPDots();

    if (this.hp <= 0) {
      this.die();
      return true; // dead
    }

    // Flash red on 1st hit
    this.armorMat.color.set(0xff2200);
    this.armorMat.emissive.set(0xff2200);
    this.armorMat.emissiveIntensity = 1.0;
    gsap.to(this.armorMat, {
      emissiveIntensity: 0,
      duration: 0.4,
      onComplete: () => {
        this.armorMat.color.set(0x556677);
        this.armorMat.emissive.set(0x000000);
      }
    });
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
    spawnParticles(this.group.position, 0x778899, 20);
    spawnParticles(this.group.position, 0xd4af37,  8);
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
