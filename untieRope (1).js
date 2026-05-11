// UntieRope.js - Babylon.js rope puzzle with interaction + undo

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
    this.moveHistory = []; // stack for undo
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
    this.moveHistory = [];
    if (this.scene) {
      this.scene.dispose();
    }
    if (this.engine) {
        this.engine.dispose();
    }
    this.startGame();
  }

  startGame() {
    const canvas = document.getElementById('ropeCanvas');
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.2, 1);

    this.camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 60, BABYLON.Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);

    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.7;

    const pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(20, 40, 20), this.scene);
    pointLight.intensity = 0.8;

    this.createLevel();
    this.setupInputHandling(canvas);

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
    this.ropes = [];
    this.pins = [];

    const levelData = [
        // Level 1: Two crossing ropes
        [
            { p1: [-15, 0, -15], p2: [15, 0, 15], color: "blue" },
            { p1: [15, 0, -15], p2: [-15, 0, 15], color: "red" }
        ],
        // Level 2: Three ropes in a triangle/cross
        [
            { p1: [-20, 0, 0], p2: [20, 0, 0], color: "green" },
            { p1: [0, 0, -20], p2: [0, 0, 20], color: "yellow" },
            { p1: [-15, 0, -15], p2: [15, 0, 15], color: "purple" }
        ],
        // Level 3: Four ropes
        [
            { p1: [-20, 0, -10], p2: [20, 0, 10], color: "cyan" },
            { p1: [-20, 0, 10], p2: [20, 0, -10], color: "orange" },
            { p1: [-10, 0, -20], p2: [10, 0, 20], color: "pink" },
            { p1: [10, 0, -20], p2: [-10, 0, 20], color: "blue" }
        ]
    ];

    const currentLevelRopes = levelData[Math.min(this.level - 1, levelData.length - 1)];
    
    currentLevelRopes.forEach((data, i) => {
        const pin1 = this.createPin(`pin_${i}_a`, new BABYLON.Vector3(...data.p1), data.color);
        const pin2 = this.createPin(`pin_${i}_b`, new BABYLON.Vector3(...data.p2), data.color);
        this.createRope(`rope_${i}`, pin1, pin2, data.color);
    });

    document.getElementById('untieRopeLevel').textContent = this.level;
    document.getElementById('ropeMoves').textContent = this.moves;
  }

  createPin(name, position, colorName) {
    const pin = BABYLON.MeshBuilder.CreateSphere(name, { diameter: 3 }, this.scene);
    pin.position = position;
    const material = new BABYLON.StandardMaterial(name + "Mat", this.scene);
    material.diffuseColor = this.colorToVector(colorName);
    pin.material = material;
    this.pins.push(pin);
    return pin;
  }

  createRope(name, startPin, endPin, colorName) {
    const particleCount = 10;
    const particles = [];
    
    for (let i = 0; i <= particleCount; i++) {
        const ratio = i / particleCount;
        const pos = BABYLON.Vector3.Lerp(startPin.position, endPin.position, ratio);
        
        const particle = BABYLON.MeshBuilder.CreateSphere(`${name}_p${i}`, { diameter: 1.5 }, this.scene);
        particle.position = pos;
        particle.isVisible = false; // Hide individual particles, we'll draw a line
        
        // The first and last particles follow the pins
        const pObj = { 
            mesh: particle, 
            isFixed: (i === 0 || i === particleCount),
            targetPin: (i === 0) ? startPin : (i === particleCount ? endPin : null)
        };
        particles.push(pObj);
    }

    const rope = {
        name: name,
        particles: particles,
        color: colorName,
        line: BABYLON.MeshBuilder.CreateLines(name + "_line", { 
            points: particles.map(p => p.mesh.position),
            updatable: true 
        }, this.scene)
    };
    
    rope.line.color = this.colorToVector(colorName);
    rope.line.width = 5;
    
    this.ropes.push(rope);
    return rope;
  }

  updateRopesPhysics() {
    this.ropes.forEach(rope => {
        // Update fixed particles to follow pins
        rope.particles.forEach(p => {
            if (p.isFixed && p.targetPin) {
                p.mesh.position.copyFrom(p.targetPin.position);
            }
        });

        // Simple relaxation to keep particles spaced out (very basic rope feel)
        for (let iter = 0; iter < 5; iter++) {
            for (let i = 1; i < rope.particles.length - 1; i++) {
                const p = rope.particles[i].mesh.position;
                const prev = rope.particles[i-1].mesh.position;
                const next = rope.particles[i+1].mesh.position;
                
                const target = prev.add(next).scale(0.5);
                p.x += (target.x - p.x) * 0.1;
                p.y += (target.y - p.y) * 0.1;
                p.z += (target.z - p.z) * 0.1;
            }
        }

        // Update visual line
        rope.line = BABYLON.MeshBuilder.CreateLines(null, { 
            points: rope.particles.map(p => p.mesh.position),
            instance: rope.line
        });
    });
  }

  checkPuzzleSolved() {
    if (this.ropes.length === 0) return;
    
    let intersections = 0;
    for (let i = 0; i < this.ropes.length; i++) {
        for (let j = i + 1; j < this.ropes.length; j++) {
            if (this.ropesIntersect(this.ropes[i], this.ropes[j])) {
                intersections++;
            }
        }
    }

    // Change rope colors based on intersection
    this.ropes.forEach(r => {
        let isIntersecting = false;
        for (let other of this.ropes) {
            if (r !== other && this.ropesIntersect(r, other)) {
                isIntersecting = true;
                break;
            }
        }
        r.line.color = isIntersecting ? new BABYLON.Color3(1, 0, 0) : this.colorToVector(r.color);
    });

    if (intersections === 0 && this.running && this.moves > 0) {
        this.levelComplete();
    }
  }

  ropesIntersect(rope1, rope2) {
    // Simple 2D intersection check for top-down view (Y=0 plane)
    const a = rope1.particles[0].mesh.position;
    const b = rope1.particles[rope1.particles.length - 1].mesh.position;
    const c = rope2.particles[0].mesh.position;
    const d = rope2.particles[rope2.particles.length - 1].mesh.position;

    const det = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
    if (det === 0) return false;

    const lambda = ((d.z - c.z) * (d.x - a.x) + (c.x - d.x) * (d.z - a.z)) / det;
    const gamma = ((a.z - b.z) * (d.x - a.x) + (b.x - a.x) * (d.z - a.z)) / det;
    
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  levelComplete() {
    this.running = false;
    const stats = `Moves: ${this.moves}`;
    
    if (typeof showVictoryModal === 'function') {
        showVictoryModal("You've untangled the ropes!", stats, () => {
            this.nextLevel();
        });
    } else {
        alert("Level Complete! " + stats);
        this.nextLevel();
    }
  }

  nextLevel() {
    this.level++;
    if (this.level > this.maxLevel) {
        this.level = 1;
        alert("Congratulations! You've completed all levels!");
    }
    gameStateManager.updateGameLevel('untieRope', this.level);
    this.initialize(this.level);
  }

  colorToVector(colorName) {
    const hex = GameEngine.COLORS[colorName] || "#ffffff";
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return new BABYLON.Color3(r, g, b);
  }

  // Save current rope positions
  saveState() {
    const state = this.pins.map(pin => pin.position.clone());
    this.moveHistory.push(state);
  }

  undo() {
    if (this.moveHistory.length === 0) {
      console.log("Nothing to undo");
      return;
    }
    const lastState = this.moveHistory.pop();
    this.pins.forEach((pin, i) => {
        pin.position.copyFrom(lastState[i]);
    });
    this.moves++;
    document.getElementById('ropeMoves').textContent = this.moves;
  }

  setupInputHandling(canvas) {
    canvas.addEventListener('pointerdown', (event) => {
      const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      if (pickResult.hit && pickResult.pickedMesh.name.startsWith('pin')) {
        this.selectedRope = pickResult.pickedMesh;
        this.camera.detachControl(canvas);
        this.saveState();
      }
    });

    canvas.addEventListener('pointermove', (event) => {
      if (this.selectedRope) {
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
        // We need a ground plane to pick against for movement
        if (!this.scene.getMeshByName("ground")) {
            const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, this.scene);
            ground.isVisible = false;
        }
        
        const pickResult2 = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
        if (pickResult2.hit) {
          this.selectedRope.position.copyFrom(pickResult2.pickedPoint);
          this.moves++;
          document.getElementById('ropeMoves').textContent = this.moves;
        }
      }
    });

    canvas.addEventListener('pointerup', () => {
      if (this.selectedRope) {
          this.selectedRope = null;
          this.camera.attachControl(canvas, true);
      }
    });
  }
}

// Global instance + exposed functions
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
