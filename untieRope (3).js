// UntieRope.js - Real 3D Physical Rope Puzzle

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
    if (this.scene) this.scene.dispose();
    if (this.engine) this.engine.dispose();
    this.startGame();
  }

  startGame() {
    const canvas = document.getElementById('ropeCanvas');
    if (!canvas) return;

    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.95, 0.9, 0.85, 1);

    // Physics Initialization
    const gravity = new BABYLON.Vector3(0, -20, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin();
    this.scene.enablePhysics(gravity, physicsPlugin);

    // Camera
    this.camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3.5, 80, BABYLON.Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);

    const ambientLight = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.7;

    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), this.scene);
    dirLight.position = new BABYLON.Vector3(20, 60, 20);
    dirLight.intensity = 0.6;

    this.createBoard();
    this.createLevel();
    this.setupInputHandling(canvas);

    this.running = true;
    this.engine.runRenderLoop(() => {
      if (this.running) {
        this.updateRopeMeshes();
        this.scene.render();
      }
    });

    window.addEventListener('resize', () => this.engine.resize());
  }

  createBoard() {
    const boardWidth = (this.boardSize.cols - 1) * this.gridSpacing + 14;
    const boardHeight = (this.boardSize.rows - 1) * this.gridSpacing + 14;
    
    const board = BABYLON.MeshBuilder.CreateBox("board", { width: boardWidth, height: 4, depth: boardHeight }, this.scene);
    board.position.y = -2;
    const boardMat = new BABYLON.StandardMaterial("boardMat", this.scene);
    boardMat.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.8);
    board.material = boardMat;
    board.physicsImpostor = new BABYLON.PhysicsImpostor(board, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5 }, this.scene);

    const startX = -(this.boardSize.cols - 1) * this.gridSpacing / 2;
    const startZ = (this.boardSize.rows - 1) * this.gridSpacing / 2;

    for (let r = 0; r < this.boardSize.rows; r++) {
        for (let c = 0; c < this.boardSize.cols; c++) {
            const hole = BABYLON.MeshBuilder.CreateCylinder(`hole_${r}_${c}`, { diameter: 5, height: 0.5 }, this.scene);
            hole.position.set(startX + c * this.gridSpacing, 0.1, startZ - r * this.gridSpacing);
            const holeMat = new BABYLON.StandardMaterial("holeMat", this.scene);
            holeMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
            hole.material = holeMat;
            this.holes.push(hole);
        }
    }

    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 300, height: 300 }, this.scene);
    ground.isVisible = false;
  }

  createLevel() {
    const getPos = (r, c) => {
        const startX = -(this.boardSize.cols - 1) * this.gridSpacing / 2;
        const startZ = (this.boardSize.rows - 1) * this.gridSpacing / 2;
        return new BABYLON.Vector3(startX + c * this.gridSpacing, 0, startZ - r * this.gridSpacing);
    };

    const levels = [
        [{ r1: 1, c1: 1, r2: 4, c2: 2, color: "blue" }, { r1: 1, c1: 2, r2: 4, c2: 1, color: "red" }],
        [{ r1: 1, c1: 0, r2: 1, c2: 3, color: "green" }, { r1: 0, c1: 1, r2: 5, c2: 1, color: "yellow" }, { r1: 4, c1: 0, r2: 4, c2: 3, color: "purple" }]
    ];

    const current = levels[Math.min(this.level - 1, levels.length - 1)];
    current.forEach((d, i) => {
        const p1 = this.createPin(`pin_${i}_a`, getPos(d.r1, d.c1), d.color);
        const p2 = this.createPin(`pin_${i}_b`, getPos(d.r2, d.c2), d.color);
        this.createRope(`rope_${i}`, p1, p2, d.color);
    });

    document.getElementById('untieRopeLevel').textContent = this.level;
  }

  createPin(name, position, colorName) {
    const pin = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: 4.5, height: 6 }, this.scene);
    pin.position.set(position.x, 3, position.z);
    const mat = new BABYLON.StandardMaterial(name + "Mat", this.scene);
    mat.diffuseColor = this.colorToVector(colorName);
    pin.material = mat;
    pin.physicsImpostor = new BABYLON.PhysicsImpostor(pin, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 0, friction: 0.5 }, this.scene);
    this.pins.push(pin);
    return pin;
  }

  createRope(name, p1, p2, colorName) {
    const segmentCount = 15;
    const radius = 1.2;
    const segments = [];
    const start = p1.position.clone().add(new BABYLON.Vector3(0, 1, 0));
    const end = p2.position.clone().add(new BABYLON.Vector3(0, 1, 0));

    for (let i = 0; i <= segmentCount; i++) {
        const sphere = BABYLON.MeshBuilder.CreateSphere(`${name}_s${i}`, { diameter: radius * 2.2 }, this.scene);
        sphere.position = BABYLON.Vector3.Lerp(start, end, i / segmentCount);
        sphere.isVisible = false;
        
        const isEnd = (i === 0 || i === segmentCount);
        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { 
            mass: isEnd ? 0 : 0.5, 
            friction: 0.5,
            restitution: 0
        }, this.scene);

        segments.push({ mesh: sphere, isFixed: isEnd, targetPin: i === 0 ? p1 : (i === segmentCount ? p2 : null) });

        if (i > 0) {
            const joint = new BABYLON.DistanceJoint({ distance: BABYLON.Vector3.Distance(segments[i-1].mesh.position, sphere.position) * 0.9 });
            segments[i-1].physicsImpostor.addJoint(sphere.physicsImpostor, joint);
        }
    }

    const tube = BABYLON.MeshBuilder.CreateTube(name + "_v", { path: segments.map(s => s.mesh.position), radius: radius, updatable: true }, this.scene);
    const mat = new BABYLON.StandardMaterial(name + "Mat", this.scene);
    mat.diffuseColor = this.colorToVector(colorName);
    tube.material = mat;

    this.ropes.push({ segments, mesh: tube });
  }

  updateRopeMeshes() {
    this.ropes.forEach(r => {
        r.segments.forEach(s => {
            if (s.isFixed) {
                s.mesh.position.copyFrom(s.targetPin.position.clone().add(new BABYLON.Vector3(0, 1, 0)));
                s.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
            }
        });
        BABYLON.MeshBuilder.CreateTube(null, { path: r.segments.map(s => s.mesh.position), instance: r.mesh });
    });
  }

  colorToVector(name) {
    const hex = GameEngine.COLORS[name] || "#ffffff";
    return BABYLON.Color3.FromHexString(hex);
  }

  setupInputHandling(canvas) {
    canvas.addEventListener('pointerdown', () => {
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pick.hit && pick.pickedMesh.name.startsWith('pin')) {
            this.selectedPin = pick.pickedMesh;
            this.camera.detachControl(canvas);
        }
    });

    canvas.addEventListener('pointermove', () => {
        if (this.selectedPin) {
            const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => m.name === "ground");
            if (pick.hit) {
                this.selectedPin.position.x = pick.pickedPoint.x;
                this.selectedPin.position.z = pick.pickedPoint.z;
                this.selectedPin.position.y = 8;
            }
        }
    });

    canvas.addEventListener('pointerup', () => {
        if (this.selectedPin) {
            let best = null, dMin = 8;
            this.holes.forEach(h => {
                const d = BABYLON.Vector2.Distance(new BABYLON.Vector2(this.selectedPin.position.x, this.selectedPin.position.z), new BABYLON.Vector2(h.position.x, h.position.z));
                const occ = this.pins.some(p => p !== this.selectedPin && BABYLON.Vector3.Distance(p.position, h.position) < 3);
                if (d < dMin && !occ) { dMin = d; best = h; }
            });
            if (best) {
                this.selectedPin.position.x = best.position.x;
                this.selectedPin.position.z = best.position.z;
                this.moves++;
                document.getElementById('ropeMoves').textContent = this.moves;
            }
            this.selectedPin.position.y = 3;
            this.selectedPin = null;
            this.camera.attachControl(canvas, true);
        }
    });
  }
}

const untieRopeGameInstance = new UntieRopeGame();
window.initUntieRope = (l) => untieRopeGameInstance.initialize(l);
window.resetUntieRope = () => untieRopeGameInstance.reset();
window.undoUntieRope = () => untieRopeGameInstance.undo();
