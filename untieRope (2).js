// UntieRope.js - 2.5D Babylon.js rope puzzle with snapping and board

class UntieRopeGame {
  constructor() {
    this.level = 1;
    this.maxLevel = 5;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.ropes = [];
    this.pins = [];
    this.holes = [];
    this.selectedPin = null;
    this.moves = 0;
    this.running = false;
    this.moveHistory = [];
    this.boardSize = { rows: 6, cols: 4 };
    this.gridSpacing = 10;
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
    this.holes = [];
    this.selectedPin = null;
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
    if (!canvas) return;

    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.95, 0.9, 0.85, 1); // Light background like the image

    // 2.5D Camera - Fixed position
    this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 80, -20), this.scene);
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    // Disable camera movement for fixed perspective
    // this.camera.attachControl(canvas, true);

    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.8;

    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), this.scene);
    dirLight.position = new BABYLON.Vector3(20, 40, 20);
    dirLight.intensity = 0.5;

    this.createBoard();
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

  createBoard() {
    // Create the main board
    const boardWidth = (this.boardSize.cols - 1) * this.gridSpacing + 10;
    const boardHeight = (this.boardSize.rows - 1) * this.gridSpacing + 10;
    
    const board = BABYLON.MeshBuilder.CreateBox("board", { 
        width: boardWidth, 
        height: 2, 
        depth: boardHeight 
    }, this.scene);
    board.position.y = -1.1;
    
    const boardMat = new BABYLON.StandardMaterial("boardMat", this.scene);
    boardMat.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.8);
    board.material = boardMat;

    // Create holes in the board
    const startX = -(this.boardSize.cols - 1) * this.gridSpacing / 2;
    const startZ = (this.boardSize.rows - 1) * this.gridSpacing / 2;

    for (let r = 0; r < this.boardSize.rows; r++) {
        for (let c = 0; c < this.boardSize.cols; c++) {
            const hole = BABYLON.MeshBuilder.CreateCylinder(`hole_${r}_${c}`, { 
                diameter: 4, 
                height: 0.2 
            }, this.scene);
            hole.position.x = startX + c * this.gridSpacing;
            hole.position.z = startZ - r * this.gridSpacing;
            hole.position.y = -0.1;
            
            const holeMat = new BABYLON.StandardMaterial("holeMat", this.scene);
            holeMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            hole.material = holeMat;
            
            this.holes.push(hole);
        }
    }

    // Ground plane for picking (invisible)
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, this.scene);
    ground.isVisible = false;
  }

  createLevel() {
    this.ropes = [];
    this.pins = [];

    // Helper to get grid position
    const getPos = (r, c) => {
        const startX = -(this.boardSize.cols - 1) * this.gridSpacing / 2;
        const startZ = (this.boardSize.rows - 1) * this.gridSpacing / 2;
        return new BABYLON.Vector3(startX + c * this.gridSpacing, 0, startZ - r * this.gridSpacing);
    };

    const levels = [
        // Level 1
        [
            { r1: 1, c1: 1, r2: 4, c2: 2, color: "blue" },
            { r1: 1, c2: 2, r2: 4, c2: 1, color: "red" }
        ],
        // Level 2
        [
            { r1: 1, c1: 0, r2: 1, c2: 3, color: "green" },
            { r1: 0, c1: 1, r2: 5, c2: 1, color: "yellow" },
            { r1: 4, c1: 0, r2: 4, c2: 3, color: "purple" }
        ],
        // Level 3
        [
            { r1: 0, c1: 0, r2: 5, c2: 3, color: "cyan" },
            { r1: 0, c1: 3, r2: 5, c2: 0, color: "orange" },
            { r1: 2, c1: 0, r2: 2, c2: 3, color: "pink" },
            { r1: 3, c1: 0, r2: 3, c2: 3, color: "blue" }
        ]
    ];

    const currentLevel = levels[Math.min(this.level - 1, levels.length - 1)];
    
    currentLevel.forEach((data, i) => {
        const pin1 = this.createPin(`pin_${i}_a`, getPos(data.r1, data.c1 || 0), data.color);
        const pin2 = this.createPin(`pin_${i}_b`, getPos(data.r2, data.c2 || 0), data.color);
        this.createRope(`rope_${i}`, pin1, pin2, data.color);
    });

    document.getElementById('untieRopeLevel').textContent = this.level;
    document.getElementById('ropeMoves').textContent = this.moves;
  }

  createPin(name, position, colorName) {
    // Create a peg-like pin
    const pinBase = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: 4.5, height: 3 }, this.scene);
    pinBase.position = position;
    pinBase.position.y = 1.5;
    
    const pinTop = BABYLON.MeshBuilder.CreateSphere(name + "_top", { diameter: 5 }, this.scene);
    pinTop.parent = pinBase;
    pinTop.position.y = 1.5;

    const material = new BABYLON.StandardMaterial(name + "Mat", this.scene);
    material.diffuseColor = this.colorToVector(colorName);
    pinBase.material = material;
    pinTop.material = material;
    
    this.pins.push(pinBase);
    return pinBase;
  }

  createRope(name, startPin, endPin, colorName) {
    const particleCount = 15;
    const particles = [];
    
    for (let i = 0; i <= particleCount; i++) {
        const ratio = i / particleCount;
        const pos = BABYLON.Vector3.Lerp(startPin.position, endPin.position, ratio);
        pos.y = 1.5; // Rope height
        
        const particle = BABYLON.MeshBuilder.CreateSphere(`${name}_p${i}`, { diameter: 0.5 }, this.scene);
        particle.position = pos;
        particle.isVisible = false;
        
        particles.push({ 
            mesh: particle, 
            isFixed: (i === 0 || i === particleCount),
            targetPin: (i === 0) ? startPin : (i === particleCount ? endPin : null)
        });
    }

    // Create a thick tube for the rope
    const path = particles.map(p => p.mesh.position);
    const ropeMesh = BABYLON.MeshBuilder.CreateTube(name + "_tube", {
        path: path,
        radius: 1.2,
        tessellation: 12,
        updatable: true
    }, this.scene);

    const material = new BABYLON.StandardMaterial(name + "RopeMat", this.scene);
    material.diffuseColor = this.colorToVector(colorName);
    ropeMesh.material = material;

    const rope = {
        name: name,
        particles: particles,
        color: colorName,
        mesh: ropeMesh
    };
    
    this.ropes.push(rope);
    return rope;
  }

  updateRopesPhysics() {
    this.ropes.forEach(rope => {
        rope.particles.forEach(p => {
            if (p.isFixed && p.targetPin) {
                p.mesh.position.copyFrom(p.targetPin.position);
                p.mesh.position.y = 1.5;
            }
        });

        // Relaxation for rope curve
        for (let iter = 0; iter < 3; iter++) {
            for (let i = 1; i < rope.particles.length - 1; i++) {
                const p = rope.particles[i].mesh.position;
                const prev = rope.particles[i-1].mesh.position;
                const next = rope.particles[i+1].mesh.position;
                
                const target = prev.add(next).scale(0.5);
                // Add a little gravity/sag
                target.y = Math.max(1.0, target.y - 0.1); 
                
                p.x += (target.x - p.x) * 0.2;
                p.y += (target.y - p.y) * 0.2;
                p.z += (target.z - p.z) * 0.2;
            }
        }

        // Update Tube mesh
        BABYLON.MeshBuilder.CreateTube(null, {
            path: rope.particles.map(p => p.mesh.position),
            instance: rope.mesh
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

    // Change rope material to indicate intersection
    this.ropes.forEach(r => {
        let isIntersecting = false;
        for (let other of this.ropes) {
            if (r !== other && this.ropesIntersect(r, other)) {
                isIntersecting = true;
                break;
            }
        }
        r.mesh.material.emissiveColor = isIntersecting ? new BABYLON.Color3(0.3, 0, 0) : new BABYLON.Color3(0, 0, 0);
    });

    if (intersections === 0 && this.running && this.moves > 0 && !this.selectedPin) {
        this.levelComplete();
    }
  }

  ropesIntersect(rope1, rope2) {
    const a = rope1.particles[0].mesh.position;
    const b = rope1.particles[rope1.particles.length - 1].mesh.position;
    const c = rope2.particles[0].mesh.position;
    const d = rope2.particles[rope2.particles.length - 1].mesh.position;

    const det = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
    if (Math.abs(det) < 0.01) return false;

    const lambda = ((d.z - c.z) * (d.x - a.x) + (c.x - d.x) * (d.z - a.z)) / det;
    const gamma = ((a.z - b.z) * (d.x - a.x) + (b.x - a.x) * (d.z - a.z)) / det;
    
    return (0.05 < lambda && lambda < 0.95) && (0.05 < gamma && gamma < 0.95);
  }

  levelComplete() {
    this.running = false;
    const stats = `Moves: ${this.moves}`;
    if (typeof showVictoryModal === 'function') {
        showVictoryModal("Perfectly Untangled!", stats, () => {
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
        alert("Zen Master! You've completed all levels!");
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

  saveState() {
    const state = this.pins.map(pin => pin.position.clone());
    this.moveHistory.push(state);
  }

  undo() {
    if (this.moveHistory.length === 0) return;
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
        this.selectedPin = pickResult.pickedMesh;
        if (this.selectedPin.parent) this.selectedPin = this.selectedPin.parent;
        this.saveState();
        // Lift the pin slightly
        this.selectedPin.position.y = 5;
      }
    });

    canvas.addEventListener('pointermove', (event) => {
      if (this.selectedPin) {
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.name === "ground");
        if (pickResult.hit) {
          this.selectedPin.position.x = pickResult.pickedPoint.x;
          this.selectedPin.position.z = pickResult.pickedPoint.z;
        }
      }
    });

    canvas.addEventListener('pointerup', () => {
      if (this.selectedPin) {
          // Snapping logic
          let closestHole = null;
          let minDist = Infinity;
          
          this.holes.forEach(hole => {
              const dist = BABYLON.Vector3.Distance(
                  new BABYLON.Vector3(this.selectedPin.position.x, 0, this.selectedPin.position.z),
                  new BABYLON.Vector3(hole.position.x, 0, hole.position.z)
              );
              
              // Check if hole is occupied
              const isOccupied = this.pins.some(p => 
                  p !== this.selectedPin && 
                  BABYLON.Vector3.Distance(
                      new BABYLON.Vector3(p.position.x, 0, p.position.z),
                      new BABYLON.Vector3(hole.position.x, 0, hole.position.z)
                  ) < 2
              );

              if (dist < minDist && !isOccupied) {
                  minDist = dist;
                  closestHole = hole;
              }
          });

          if (closestHole && minDist < 8) {
              this.selectedPin.position.x = closestHole.position.x;
              this.selectedPin.position.z = closestHole.position.z;
              this.moves++;
              document.getElementById('ropeMoves').textContent = this.moves;
          } else {
              // Return to previous state if not snapped
              const lastState = this.moveHistory[this.moveHistory.length - 1];
              const pinIdx = this.pins.indexOf(this.selectedPin);
              this.selectedPin.position.copyFrom(lastState[pinIdx]);
              this.moveHistory.pop();
          }

          this.selectedPin.position.y = 1.5;
          this.selectedPin = null;
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
