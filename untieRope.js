// untieRope.js - 3D Rope Physics Game
// Using Babylon.js with Babylon's native physics (Havok)

class UntieRopeGame {
  constructor() {
    this.level = 1;
    this.maxLevel = 5;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.ropes = [];
    this.pins = [];
    this.selectedRope = null;
    this.moves = 0;
    this.running = false;
  }

  initialize(level) {
    this.level = Math.min(level, this.maxLevel);
    this.moves = 0;
    this.reset();
  }

  reset() {
    this.moves = 0;
    this.ropes = [];
    this.pins = [];
    this.selectedRope = null;
    if (this.scene) {
      this.scene.dispose();
    }
    this.startGame();
  }

  startGame() {
    const canvas = document.getElementById('ropeCanvas');
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Create Babylon scene
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    // Camera
    this.camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 30, 80));
    this.camera.attachControl(canvas, true);
    this.camera.inertia = 0.7;
    this.camera.angularSensibility = 1000;
    this.camera.speed = 0;
    this.camera.minZ = 0.1;

    // Lighting
    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.7;

    const pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(20, 40, 20), this.scene);
    pointLight.intensity = 0.8;

    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, this.scene);
    ground.material = new BABYLON.StandardMaterial('groundMat', this.scene);
    ground.material.diffuse = new BABYLON.Color3(0.2, 0.2, 0.3);

    // Create level
    this.createLevel();

    // Render loop
    this.running = true;
    this.engine.runRenderLoop(() => {
      if (this.running) {
        this.updateRopesPhysics();
        this.checkPuzzleSolved();
        this.scene.render();
      }
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  createLevel() {
    const configs = [
      { pins: [[0, 0], [10, 0], [5, 8.66]], ropes: [[0, 1, 'red'], [1, 2, 'blue']] },
      { pins: [[0, 0], [10, 0], [5, 8.66], [-5, 8.66]], ropes: [[0, 1, 'red'], [1, 2, 'blue'], [2, 3, 'green']] },
      { pins: [[0, 0], [10, 0], [15, 8.66], [5, 8.66], [-5, 8.66]], ropes: [[0, 1, 'red'], [1, 2, 'blue'], [2, 3, 'green'], [3, 4, 'yellow']] },
      { pins: [[0, 0], [12, 0], [18, 10], [6, 12], [-6, 12], [-12, 10]], ropes: [[0, 1, 'red'], [1, 2, 'blue'], [2, 3, 'green'], [3, 4, 'yellow'], [4, 5, 'purple']] },
      { pins: [[0, 0], [15, 0], [22, 12], [10, 16], [0, 18], [-10, 16], [-22, 12], [-15, 0]], ropes: [[0, 1, 'red'], [1, 2, 'blue'], [2, 3, 'green'], [3, 4, 'yellow'], [4, 5, 'purple'], [5, 6, 'pink'], [6, 7, 'cyan']] }
    ];

    const config = configs[this.level - 1];
    if (!config) return;

    // Create pins
    config.pins.forEach((pinData, idx) => {
      this.createPin(idx, pinData[0], pinData[1]);
    });

    // Create ropes - tangled based on level
    const tangleAmount = this.level * 0.3;
    config.ropes.forEach((ropeData, idx) => {
      this.createRope(ropeData[0], ropeData[1], ropeData[2], tangleAmount, idx);
    });
  }

  createPin(id, x, z) {
    const pinMesh = BABYLON.MeshBuilder.CreateSphere('pin_' + id, { diameter: 1.5, segments: 16 }, this.scene);
    pinMesh.position = new BABYLON.Vector3(x, 1, z);

    const pinMaterial = new BABYLON.StandardMaterial('pinMat_' + id, this.scene);
    pinMaterial.diffuse = new BABYLON.Color3(0.7, 0.7, 0.7);
    pinMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    pinMaterial.specularPower = 32;
    pinMesh.material = pinMaterial;

    this.pins.push({
      id,
      mesh: pinMesh,
      position: new BABYLON.Vector3(x, 1, z)
    });
  }

  createRope(startPinId, endPinId, color, tangleAmount, ropeIdx) {
    const startPin = this.pins[startPinId];
    const endPin = this.pins[endPinId];

    if (!startPin || !endPin) return;

    const segments = 15 + this.level * 2;
    const ropeParticles = [];
    const ropeConstraints = [];

    const startPos = startPin.position.clone();
    const endPos = endPin.position.clone();

    // Create rope segments with tangles
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      let pos = BABYLON.Vector3.Lerp(startPos, endPos, t);

      // Add tangle variation based on level
      if (tangleAmount > 0 && i > 0 && i < segments - 1) {
        const waveX = Math.sin(t * Math.PI * (2 + ropeIdx)) * tangleAmount * 2;
        const waveZ = Math.cos(t * Math.PI * (2 + ropeIdx)) * tangleAmount * 2;
        const waveY = Math.sin(t * Math.PI * 4) * tangleAmount;
        pos.x += waveX;
        pos.z += waveZ;
        pos.y += waveY;
      }

      // Create rope segment
      const segmentMesh = BABYLON.MeshBuilder.CreateSphere('rope_' + ropeIdx + '_' + i, { diameter: 0.4, segments: 8 }, this.scene);
      segmentMesh.position = pos;

      const ropeMaterial = new BABYLON.StandardMaterial('ropeMat_' + ropeIdx + '_' + i, this.scene);
      ropeMaterial.diffuse = this.colorToVector(color);
      ropeMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      segmentMesh.material = ropeMaterial;

      ropeParticles.push({
        mesh: segmentMesh,
        velocity: new BABYLON.Vector3(0, 0, 0),
        mass: i === 0 || i === segments - 1 ? 0 : 0.05,
        id: i,
        pinned: i === 0 || i === segments - 1
      });
    }

    // Create constraints between rope segments
    for (let i = 0; i < ropeParticles.length - 1; i++) {
      const current = ropeParticles[i];
      const next = ropeParticles[i + 1];

      const distance = BABYLON.Vector3.Distance(current.mesh.position, next.mesh.position);

      ropeConstraints.push({
        p1: current,
        p2: next,
        restDistance: distance * 1.05,
        stiffness: 0.98
      });
    }

    this.ropes.push({
      id: ropeIdx,
      color,
      startPinId,
      endPinId,
      particles: ropeParticles,
      constraints: ropeConstraints,
      isTangled: true
    });
  }

  updateRopesPhysics() {
    const dt = 0.016; // ~60fps
    const gravity = new BABYLON.Vector3(0, -9.81, 0);
    const damping = 0.99;
    const constraintIterations = 5;

    this.ropes.forEach(rope => {
      // Verlet integration for particle physics
      rope.particles.forEach(particle => {
        if (particle.pinned || particle.mass === 0) return;

        const oldPos = particle.mesh.position.clone();
        const acc = gravity.scale(1 / particle.mass);

        particle.velocity.addInPlace(acc.scale(dt));
        particle.velocity.scaleInPlace(damping);

        particle.mesh.position.addInPlace(particle.velocity.scale(dt));
      });

      // Constraint satisfaction (multiple iterations for stability)
      for (let iter = 0; iter < constraintIterations; iter++) {
        rope.constraints.forEach(constraint => {
          const delta = constraint.p2.mesh.position.subtract(constraint.p1.mesh.position);
          const distance = delta.length();
          const difference = (distance - constraint.restDistance) / distance;

          if (Math.abs(difference) > 0.01) {
            const correction = delta.scale(difference * (1 - constraint.stiffness) * 0.5);

            if (!constraint.p1.pinned && constraint.p1.mass > 0) {
              constraint.p1.mesh.position.subtractInPlace(correction);
            }
            if (!constraint.p2.pinned && constraint.p2.mass > 0) {
              constraint.p2.mesh.position.addInPlace(correction);
            }
          }
        });
      }

      // Collision with pins
      rope.particles.forEach(particle => {
        if (particle.pinned) return;

        this.pins.forEach(pin => {
          const diff = particle.mesh.position.subtract(pin.position);
          const dist = diff.length();
          const minDist = 1.5; // pin radius + particle radius

          if (dist < minDist) {
            const normal = diff.normalize();
            particle.mesh.position = pin.position.add(normal.scale(minDist));
          }
        });
      });
    });
  }

  checkPuzzleSolved() {
    let allUntangled = true;

    for (let i = 0; i < this.ropes.length; i++) {
      const rope1 = this.ropes[i];

      // Check rope straightness (untangled ropes should be relatively straight)
      let totalDeflection = 0;
      let deflectionCount = 0;

      for (let j = 1; j < rope1.particles.length - 1; j++) {
        const p1 = rope1.particles[j - 1].mesh.position;
        const p2 = rope1.particles[j].mesh.position;
        const p3 = rope1.particles[j + 1].mesh.position;

        const v1 = p2.subtract(p1).normalize();
        const v2 = p3.subtract(p2).normalize();
        const dotProduct = Math.min(1, Math.max(-1, BABYLON.Vector3.Dot(v1, v2)));
        const angle = Math.acos(dotProduct);

        totalDeflection += angle;
        deflectionCount++;
      }

      const averageDeflection = deflectionCount > 0 ? totalDeflection / deflectionCount : 0;

      // If rope is still too curled up, it's tangled
      if (averageDeflection > 0.25) {
        allUntangled = false;
        break;
      }

      // Check for intersections with other ropes
      if (allUntangled) {
        for (let k = i + 1; k < this.ropes.length; k++) {
          const rope2 = this.ropes[k];
          if (this.ropesIntersect(rope1, rope2)) {
            allUntangled = false;
            break;
          }
        }
      }

      if (!allUntangled) break;
    }

    if (allUntangled) {
      this.levelComplete();
    }
  }

  ropesIntersect(rope1, rope2) {
    // Check if two ropes are intersecting by sampling points along each rope
    const sampleSize = Math.max(1, Math.floor(rope1.particles.length / 5));

    for (let i = 0; i < rope1.particles.length; i += sampleSize) {
      for (let j = 0; j < rope2.particles.length; j += sampleSize) {
        const p1 = rope1.particles[i].mesh.position;
        const p2 = rope2.particles[j].mesh.position;

        const distance = BABYLON.Vector3.Distance(p1, p2);

        // If ropes get too close (within 1.2 units), they're intersecting
        if (distance < 1.2) {
          return true;
        }
      }
    }

    return false;
  }

  levelComplete() {
    this.running = false;
    gameStateManager.updateGameLevel('untieRope', this.level + 1);
    const message = `Level ${this.level} Complete!`;
    const stats = `Puzzle Solved!`;
    showVictoryModal(message, stats, () => this.nextLevel());
  }

  nextLevel() {
    this.initialize(this.level + 1);
  }

  undo() {
    console.log("Undo not implemented yet");
  }

  colorToVector(colorName) {
    const colors = {
      red: new BABYLON.Color3(1, 0, 0),
      blue: new BABYLON.Color3(0, 0.5, 1),
      green: new BABYLON.Color3(0, 1, 0),
      yellow: new BABYLON.Color3(1, 1, 0),
      purple: new BABYLON.Color3(1, 0, 1),
      pink: new BABYLON.Color3(1, 0.75, 0.8),
      cyan: new BABYLON.Color3(0, 1, 1),
      orange: new BABYLON.Color3(1, 0.65, 0)
    };
    return colors[colorName] || colors.blue;
  }
}

// Create global instance and expose functions
const untieRopeGameInstance = new UntieRopeGame();

window.initUntieRope = function(level) {
  untieRopeGameInstance.initialize(level);
};

window.resetUntieRope = function() {
  untieRopeGameInstance.reset();
};

window.undoUntieRope = function() {
  untieRopeGameInstance.undo();
};
