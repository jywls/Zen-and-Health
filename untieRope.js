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

    this.camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 30, 80));
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

  // ... keep your createLevel, createPin, createRope, updateRopesPhysics, checkPuzzleSolved, ropesIntersect, levelComplete, nextLevel, colorToVector methods unchanged ...

  // Save current rope positions
  saveState() {
    const state = this.ropes.map(rope =>
      rope.particles.map(p => p.mesh.position.clone())
    );
    this.moveHistory.push(state);
  }

  undo() {
    if (this.moveHistory.length === 0) {
      console.log("Nothing to undo");
      return;
    }
    const lastState = this.moveHistory.pop();
    this.ropes.forEach((rope, i) => {
      rope.particles.forEach((p, j) => {
        p.mesh.position.copyFrom(lastState[i][j]);
      });
    });
    this.moves++;
  }

  setupInputHandling(canvas) {
    canvas.addEventListener('pointerdown', (event) => {
      const pickResult = this.scene.pick(event.clientX, event.clientY);
      if (pickResult.hit && pickResult.pickedMesh.name.startsWith('rope')) {
        this.selectedRope = pickResult.pickedMesh;
        this.saveState(); // record state before move
      }
    });

    canvas.addEventListener('pointermove', (event) => {
      if (this.selectedRope) {
        const pickResult = this.scene.pick(event.clientX, event.clientY);
        if (pickResult.hit) {
          this.selectedRope.position.copyFrom(pickResult.pickedPoint);
          this.moves++;
          document.getElementById('ropeMoves').textContent = this.moves;
        }
      }
    });

    canvas.addEventListener('pointerup', () => {
      this.selectedRope = null;
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
