import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

let scene, camera, renderer, controls, world;
let ropes = [], pins = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedRope = null;

const GRID_SIZE = 8;
const CELL_SIZE = 10;

function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202030);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 50, 150);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0x404040));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  // Physics world
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  // Draw grid
  drawGrid();

  // Pins
  createPin(0, 0);
  createPin(3, 3);
  createPin(6, 2);

  // Ropes
  createRope({row:0,col:0}, {row:7,col:7}, 0xff0000);
  createRope({row:2,col:6}, {row:7,col:1}, 0x00ff00);

  // Events
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  animate();
}

function drawGrid() {
  const gridHelper = new THREE.GridHelper(GRID_SIZE*CELL_SIZE, GRID_SIZE, 0x444444, 0x222222);
  scene.add(gridHelper);
}

function createPin(row, col) {
  const x = col * CELL_SIZE - (GRID_SIZE*CELL_SIZE)/2;
  const z = row * CELL_SIZE - (GRID_SIZE*CELL_SIZE)/2;

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x888888 }));
  mesh.position.set(x, 0, z);
  scene.add(mesh);

  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(2) });
  body.position.set(x, 0, z);
  world.addBody(body);

  pins.push({ mesh, body });
}

function createRope(startCell, endCell, color) {
  const segments = 12;
  const ropeMaterial = new THREE.MeshStandardMaterial({ color });
  const ropeBodies = [];
  const ropeMeshes = [];

  const start = cellToPosition(startCell);
  const end = cellToPosition(endCell);

  for (let i = 0; i < segments; i++) {
    const pos = new THREE.Vector3(
      start.x + (end.x - start.x) * (i/segments),
      5,
      start.z + (end.z - start.z) * (i/segments)
    );
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), ropeMaterial);
    mesh.position.copy(pos);
    scene.add(mesh);

    const body = new CANNON.Body({ mass: 0.1, shape: new CANNON.Sphere(1.5) });
    body.position.copy(pos);
    world.addBody(body);

    ropeBodies.push(body);
    ropeMeshes.push(mesh);

    if (i > 0) {
      const constraint = new CANNON.DistanceConstraint(ropeBodies[i-1], body, CELL_SIZE/segments);
      world.addConstraint(constraint);
    }
  }

  ropes.push({ bodies: ropeBodies, meshes: ropeMeshes, color });
}

function cellToPosition(cell) {
  return {
    x: cell.col * CELL_SIZE - (GRID_SIZE*CELL_SIZE)/2,
    z: cell.row * CELL_SIZE - (GRID_SIZE*CELL_SIZE)/2
  };
}

function onMouseDown(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(ropes.flatMap(r => r.meshes));
  if (intersects.length > 0) {
    selectedRope = ropes.find(r => r.meshes.includes(intersects[0].object));
  }
}

function onMouseMove(event) {
  if (!selectedRope) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pos = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, pos);

  // Move last segment
  selectedRope.bodies[selectedRope.bodies.length-1].position.copy(pos);
}

function onMouseUp() {
  selectedRope = null;
  checkPuzzleSolved();
}

function checkPuzzleSolved() {
  if (world.contacts.length === 0) {
    console.log("Puzzle solved!");
    ropes.forEach(r => popOffAnimation(r.meshes));
  }
}

function popOffAnimation(meshes) {
  meshes.forEach(mesh => {
    let scale = 1;
    function animatePop() {
      scale += 0.05;
      mesh.scale.set(scale, scale, scale);
      mesh.material.opacity -= 0.05;
      mesh.material.transparent = true;
      if (mesh.material.opacity > 0) {
        requestAnimationFrame(animatePop);
      } else {
        scene.remove(mesh);
      }
    }
    animatePop();
  });
}

function animate() {
  requestAnimationFrame(animate);
  world.step(1/60);

  ropes.forEach(rope => {
    rope.meshes.forEach((mesh, i) => {
      mesh.position.copy(rope.bodies[i].position);
    });
  });

  renderer.render(scene, camera);
}

init();
