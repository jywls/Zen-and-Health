// untieRope.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

class UntieRopeGame {
  constructor() {
    this.level = 1;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.world = null;
    this.ropes = [];
    this.pins = [];
    this.running = false;
  }

  initialize(level) {
    this.level = level;
    this.reset();
  }

  reset() {
    // clear old scene if any
    if (this.renderer) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }
    this.ropes = [];
    this.pins = [];
    this.startGame();
  }

  undo() {
    // placeholder for undo logic
    console.log("Undo not implemented yet");
  }

  startGame() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202030);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 50, 150);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('ropeCanvas') });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x404040));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 100, 50);
    this.scene.add(dirLight);

    // Physics world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    // Grid helper
    const gridHelper = new THREE.GridHelper(80, 8, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Pins
    this.createPin(0, 0);
    this.createPin(3, 3);
    this.createPin(6, 2);

    // Ropes
    this.createRope({row:0,col:0}, {row:7,col:7}, 0xff0000);
    this.createRope({row:2,col:6}, {row:7,col:1}, 0x00ff00);

    this.running = true;
    this.animate();
  }

  cellToPosition(cell) {
    const CELL_SIZE = 10;
    const GRID_SIZE = 8;
    return {
      x: cell.col * CELL_SIZE - (GRID_SIZE*CELL_SIZE)/2,
      z: cell.row * CELL_SIZE - (GRID_SIZE*CELL_SIZE)/2
    };
  }

  createPin(row, col) {
    const pos = this.cellToPosition({row, col});
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888 }));
    mesh.position.set(pos.x, 0, pos.z);
    this.scene.add(mesh);

    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(2) });
    body.position.set(pos.x, 0, pos.z);
    this.world.addBody(body);

    this.pins.push({ mesh, body });
  }

  createRope(startCell, endCell, color) {
    const segments = 12;
    const ropeMaterial = new THREE.MeshStandardMaterial({ color });
    const ropeBodies = [];
    const ropeMeshes = [];

    const start = this.cellToPosition(startCell);
    const end = this.cellToPosition(endCell);

    for (let i = 0; i < segments; i++) {
      const pos = new THREE.Vector3(
        start.x + (end.x - start.x) * (i/segments),
        5,
        start.z + (end.z - start.z) * (i/segments)
      );
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), ropeMaterial);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const body = new CANNON.Body({ mass: 0.1, shape: new CANNON.Sphere(1.5) });
      body.position.copy(pos);
      this.world.addBody(body);

      ropeBodies.push(body);
      ropeMeshes.push(mesh);

      if (i > 0) {
        const constraint = new CANNON.DistanceConstraint(ropeBodies[i-1], body, 7);
        this.world.addConstraint(constraint);
      }
    }

    this.ropes.push({ bodies: ropeBodies, meshes: ropeMeshes, color });
  }

  checkPuzzleSolved() {
    if (this.world.contacts.length === 0) {
      showVictoryModal("Untie the Rope Complete!", `Moves: ${0}`, () => {
        this.initialize(this.level+1);
      });
    }
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());
    this.world.step(1/60);

    this.ropes.forEach(rope => {
      rope.meshes.forEach((mesh, i) => {
        mesh.position.copy(rope.bodies[i].position);
      });
    });

    this.renderer.render(this.scene, this.camera);
  }
}

// Create global instance
const untieRopeGameInstance = new UntieRopeGame();

// Export global functions that app.js expects
window.initUntieRope = function(level) {
  untieRopeGameInstance.initialize(level);
};

window.resetUntieRope = function() {
  untieRopeGameInstance.reset();
};

window.undoUntieRope = function() {
  untieRopeGameInstance.undo();
};
