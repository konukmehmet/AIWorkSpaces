// ============================================================
//  player.js — OttomanBird (horse + rider) with physics
// ============================================================
import * as THREE from 'three';
import { gsap } from 'gsap';
import { scene } from './scene.js';
import {
  GRAVITY, JUMP_STRENGTH, BIRD_X,
  GROUND_Y, CEILING_Y, SPIT_COOLDOWN_MS,
} from './config.js';
import { GameState, state } from './state.js';

// ---- Projectiles (owned by player module) ---------------
export const spits  = [];
export const arrows = []; // arrows fired at player from enemies

// ---- Arrow class ----------------------------------------
export class Arrow {
  constructor(position) {
    this.group = new THREE.Group();
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4), shaftMat);
    shaft.rotation.z = Math.PI / 2;
    this.group.add(shaft);

    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.9,
      emissive: 0xffffff, emissiveIntensity: 0.6,
    });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), tipMat);
    tip.position.x = -0.7;
    tip.rotation.z = Math.PI / 2;
    this.group.add(tip);

    this.group.position.copy(position);
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update() {
    this.group.position.x -= 0.28;
    this.group.updateMatrixWorld();
    this.box.setFromObject(this.group);
    if (this.group.position.x < -30) { scene.remove(this.group); return false; }
    return true;
  }

  destroy() { scene.remove(this.group); }
}

// ---- Spit class -----------------------------------------
export class Spit {
  constructor(position, scale) {
    this.group = new THREE.Group();
    const mat  = new THREE.MeshBasicMaterial({ color: 0x55ff00 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15 * scale, 8, 8), mat);
    this.group.add(mesh);
    this.group.position.copy(position);
    scene.add(this.group);
    this.box = new THREE.Box3();
  }

  update() {
    this.group.position.x += 0.42;
    this.group.updateMatrixWorld();
    this.box.setFromObject(this.group);
    if (this.group.position.x > 30) { scene.remove(this.group); return false; }
    return true;
  }

  destroy() { scene.remove(this.group); }
}

// ---- OttomanBird ----------------------------------------
export class OttomanBird {
  constructor() {
    this.group      = new THREE.Group();
    this.velocity   = 0;
    this.isSwinging = false;
    this.currentScale = 1.0;
    this.lastSpitTime = 0;
    this._buildHorse();
    this._buildRider();
    this.group.position.set(BIRD_X, 3, 0);
    scene.add(this.group);
  }

  // ---- Construction helpers ----
  _buildHorse() {
    this.horseGroup = new THREE.Group();
    const horseMat  = new THREE.MeshStandardMaterial({ color: 0x512e10 });

    // Body
    this.horseGroup.add(Object.assign(
      new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), horseMat)
    ));

    // Neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), horseMat);
    neck.position.set(0.6, 0.5, 0); neck.rotation.z = -0.4;
    this.horseGroup.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), horseMat);
    head.position.set(0.8, 0.8, 0);
    this.horseGroup.add(head);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6);
    this.frontLegs = [];
    [[0.4, 0.2], [0.4, -0.2], [-0.4, 0.2], [-0.4, -0.2]].forEach(([x, z]) => {
      const legGeoClone = new THREE.CylinderGeometry(0.1, 0.1, 0.6);
      // Offset geometry to hinge at the top of the leg
      legGeoClone.translate(0, -0.3, 0);
      const leg = new THREE.Mesh(legGeoClone, horseMat);
      leg.position.set(x, -0.4, z); // attach closer to top body
      this.horseGroup.add(leg);
      if (x > 0) this.frontLegs.push(leg);
    });

    this.horseGroup.position.y = -0.5;
    this.group.add(this.horseGroup);
  }

  _buildRider() {
    this.riderGroup = new THREE.Group();
    const shirtMat  = new THREE.MeshStandardMaterial({ color: 0x3d6bab }); // blue overalls
    const hatMat    = new THREE.MeshStandardMaterial({ color: 0xd4a96a }); // straw hat
    const skinMat   = new THREE.MeshStandardMaterial({ color: 0xffcc99 });

    // Body
    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), shirtMat);
    this.riderGroup.add(this.body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat);
    head.position.y = 0.5;
    this.riderGroup.add(head);

    // Straw Hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12), hatMat);
    brim.position.y = 0.72;
    this.riderGroup.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.25, 12), hatMat);
    crown.position.y = 0.85;
    this.riderGroup.add(crown);

    // Weapon (Pitchfork instead of sword)
    this.swordGroup = new THREE.Group();
    this.bladeMat = new THREE.MeshStandardMaterial({ 
      color: 0xaaaaaa, emissive: 0x000000, metalness: 0.8, roughness: 0.2 
    });
    
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5), handleMat);
    this.swordGroup.add(handle);

    const tineBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), this.bladeMat);
    tineBase.position.y = 1.25;
    this.swordGroup.add(tineBase);

    this.swordMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), this.bladeMat);
    this.swordMesh.position.y = 1.5;
    this.swordGroup.add(this.swordMesh);

    [-0.12, 0.12].forEach(xOff => {
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), this.bladeMat);
      tine.position.set(xOff, 1.45, 0);
      this.swordGroup.add(tine);
    });

    this.swordGroup.position.set(0.7, -0.1, 0.4);
    this.swordGroup.rotation.z = -Math.PI / 2;
    this.riderGroup.add(this.swordGroup);

    this.riderGroup.position.y = 0.4;
    this.group.add(this.riderGroup);
  }

  // ---- Actions ----
  jump() {
    if (state.phase !== GameState.PLAYING) return;
    this.velocity = JUMP_STRENGTH;
    if (this.frontLegs) {
      this.frontLegs.forEach(leg => {
        gsap.to(leg.rotation, { z: -1.2, duration: 0.15, yoyo: true, repeat: 1 });
      });
    }
  }

  swing() {
    if (state.phase !== GameState.PLAYING || this.isSwinging) return;
    this.isSwinging = true;

    // Glow effect on swing
    this.bladeMat.emissive.set(0xffd700);
    this.bladeMat.emissiveIntensity = 1.2;

    // Jousting Thrust: Push weapon forward towards the enemy
    gsap.to(this.swordGroup.position, {
      x: 2.2, // thrust forward significantly
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    // Slash slightly downwards
    gsap.to(this.swordGroup.rotation, {
      z: -Math.PI / 1.4, 
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // Keep the weapon deadly for an extra 200ms after the animation!
        setTimeout(() => { this.isSwinging = false; }, 200);
        gsap.to(this.bladeMat, { emissiveIntensity: 0.3, duration: 0.3,
          onUpdate: () => this.bladeMat.emissive.set(0xffffff),
        });
      }
    });
  }

  spit() {
    if (state.phase !== GameState.PLAYING) return;
    if (Date.now() - this.lastSpitTime < SPIT_COOLDOWN_MS) return;
    this.lastSpitTime = Date.now();
    const pos = new THREE.Vector3();
    this.horseGroup.getWorldPosition(pos);
    pos.y += 0.8;
    pos.x += 1.0;
    spits.push(new Spit(pos, this.currentScale));
  }

  updateScale(score) {
    this.currentScale = 1 + Math.min(score * 0.02, 1.5);
    this.swordGroup.scale.setScalar(this.currentScale);
    // flag removed in farm theme
  }

  // ---- Per-frame ----
  /** Returns a box for the horse/rider body only (not weapon) */
  getBodyBox() {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    
    // Use a much smaller, fairer 'hurtbox' inside the player's center
    // This prevents cheap deaths from hitting the tips of the 3D model
    return new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(
      0.9 * this.currentScale, 
      0.9 * this.currentScale, 
      0.8 * this.currentScale
    ));
  }

  getSwordBox() {
    if (!this.isSwinging) return new THREE.Box3().makeEmpty();
    
    const pos = new THREE.Vector3();
    if (this.swordMesh) {
      this.swordMesh.getWorldPosition(pos);
    } else {
      this.swordGroup.getWorldPosition(pos);
    }

    // A manually sized box centered on the blade guarantees consistent hits
    // regardless of the exact rotation angle of the mesh.
    return new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(
      3.5 * this.currentScale,
      3.5 * this.currentScale,
      1.5 * this.currentScale
    ));
  }

  update(onDeath) {
    if (state.phase !== GameState.PLAYING) return;
    this.velocity += GRAVITY;
    this.group.position.y += this.velocity;

    // Smoother tilt
    this.group.rotation.z = Math.max(-0.4, Math.min(0.2, this.velocity * 2));

    // Ground check: Only if we've fallen significantly (safety)
    // and aren't just starting the animation.
    if (this.group.position.y < GROUND_Y) {
      onDeath('Ground Hit');
    }
    if (this.group.position.y > CEILING_Y) {
      onDeath('Ceiling Hit');
    }
  }

  reset() {
    this.group.position.set(BIRD_X, 3, 0);
    this.group.rotation.set(0, 0, 0);
    this.velocity      = 0;
    this.isSwinging    = false;
    this.lastSpitTime  = 0;
    this.bladeMat.emissive.set(0xffffff);
    this.bladeMat.emissiveIntensity = 0.3;
    this.updateScale(0);
    this.group.updateMatrixWorld();
  }
}
