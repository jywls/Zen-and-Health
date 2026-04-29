// untieRope.js - 3D Rope Physics Game
// Using Babylon.js for 3D rendering and physics

class UntieRopeGame {
  constructor() {
    this.level = 1;
    this.maxLevel = 5;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.physics = null;
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
    this.scene.collisionsEnabled = true;
    this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);

    // Camera
    this.camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 30, 80));
    this.camera.attachControl(canvas, true);
    this.camera.inertia = 0.7;
    this.camera.angularSensibility = 1000;
    this.camera.speed = 0;

    // Lighting
    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.7;

    const pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(20, 40, 20), this.scene);
    pointLight.intensity = 0.8;

    // Physics engine
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin();
    this.scene.enablePhysics(gravityVector, physicsPlugin);

    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, this.scene);
    ground.material = new BABYLON.StandardMaterial('groundMat', this.scene);
    ground.material.diffuse = new BABYLON.Color3(0.2, 0.2, 0.3);
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5 }, this.scene);

    // Create level
    this.createLevel();

    // Input handling
    this.setupInputHandling(canvas);

    // Render loop
    this.running = true;
    this.engine.runRenderLoop(() => {
      if (this.running) {
        this.updateRopesDisplay();
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
    const pinMesh = BABYLON.MeshBuilder.CreateSphere('pin_' + id, { diameter: 1.5 }, this.scene);
    pinMesh.position = new BABYLON.Vector3(x, 1, z);

    const pinMaterial = new BABYLON.StandardMaterial('pinMat_' + id, this.scene);
    pinMaterial.diffuse = new BABYLON.Color3(0.7, 0.7, 0.7);
    pinMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    pinMesh.material = pinMaterial;

    const pinPhysics = new BABYLON.PhysicsImpostor(pinMesh, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0, restitution: 0.3 }, this.scene);

    this.pins.push({
      id,
      mesh: pinMesh,
      position: new BABYLON.Vector3(x, 1, z),
      physics: pinPhysics
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
      const segmentMesh = BABYLON.MeshBuilder.CreateSphere('rope_' + ropeIdx + '_' + i, { diameter: 0.4 }, this.scene);
      segmentMesh.position = pos;

      const ropeMaterial = new BABYLON.StandardMaterial('ropeMat_' + ropeIdx + '_' + i, this.scene);
      ropeMaterial.diffuse = this.colorToVector(color);
      segmentMesh.material = ropeMaterial;

      const mass = i === 0 || i === segments - 1 ? 0 : 0.05;
      const physics = new BABYLON.PhysicsImpostor(segmentMesh, BABYLON.PhysicsImpostor.SphereImpostor, { mass, friction: 0.3, restitution: 0.2 }, this.scene);

      ropeParticles.push({
        mesh: segmentMesh,
        physics,
        mass,
        id: i
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
        restDistance: distance * 1.1,
        stiffness: 0.95
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

  updateRopesDisplay() {
    // Apply distance constraints
    this.ropes.forEach(rope => {
      rope.constraints.forEach(constraint => {
        const delta = constraint.p2.mesh.position.subtract(constraint.p1.mesh.position);
        const distance = delta.length();
        const difference = (distance - constraint.restDistance) / distance;

        if (distance > constraint.restDistance * 1.05) {
          const correction = delta.scale(difference * (1 - constraint.stiffness) * 0.5);
          if (constraint.p1.mass > 0) {
            constraint.p1.mesh.position.subtractInPlace(correction);
          }
          if (constraint.p2.mass > 0) {
            constraint.p2.mesh.position.addInPlace(correction);
          }
        }
      });
    });
  }

  checkPuzzleSolved() {
    // Robust untangle detection
    // Check if all ropes are not intersecting and are mostly untangled
    let allUntangled = true;

    for (let i = 0; i < this.ropes.length; i++) {
      const rope1 = this.ropes[i];

      // Check rope straightness (untangled ropes should be relatively straight)
      let totalDeflection = 0;
      for (let j = 1; j < rope1.particles.length - 1; j++) {
        const p1 = rope1.particles[j - 1].mesh.position;
        const p2 = rope1.particles[j].mesh.position;
        const p3 = rope1.particles[j + 1].mesh.position;

        const v1 = p2.subtract(p1).normalize();
        const v2 = p3.subtract(p2).normalize();
        const angle = Math.acos(Math.min(1, Math.max(-1, BABYLON.Vector3.Dot(v1, v2))));
        totalDeflection += angle;
      }

      const averageDeflection = totalDeflection / (rope1.particles.length - 2);

      // If rope is still too curled up, it's tangled
      if (averageDeflection > 0.3) {
        allUntangled = false;
        break;
      }

      // Check for intersections with other ropes
      for (let k = i + 1; k < this.ropes.length; k++) {
        const rope2 = this.ropes[k];
        if (this.ropesIntersect(rope1, rope2)) {
          allUntangled = false;
          break;
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
    const sampleSize = 5;

    for (let i = 0; i < rope1.particles.length; i += sampleSize) {
      for (let j = 0; j < rope2.particles.length; j += sampleSize) {
        const p1 = rope1.particles[i].mesh.position;
        const p2 = rope2.particles[j].mesh.position;

        const distance = BABYLON.Vector3.Distance(p1, p2);

        // If ropes get too close (within 1.5 units), they're intersecting
        if (distance < 1.5) {
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
    const stats = `Moves: ${this.moves}`;
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
      blue: new BABYLON.Color3(0, 0, 1),
      green: new BABYLON.Color3(0, 1, 0),
      yellow: new BABYLON.Color3(1, 1, 0),
      purple: new BABYLON.Color3(1, 0, 1),
      pink: new BABYLON.Color3(1, 0.75, 0.8),
      cyan: new BABYLON.Color3(0, 1, 1),
      orange: new BABYLON.Color3(1, 0.65, 0)
    };
    return colors[colorName] || colors.blue;
  }

  setupInputHandling(canvas) {
    // Handle clicks to select/interact with ropes (optional for future enhancements)
    canvas.addEventListener('click', (event) => {
      const pickResult = this.scene.pick(event.clientX, event.clientY);
      if (pickResult.hit && pickResult.pickedMesh) {
        // Could implement rope grabbing/dragging here
      }
    });
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
