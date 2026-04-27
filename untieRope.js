import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

let scene, camera, renderer, controls;
let world;
let ropes = [], pins = [];

function init() {
  // Three.js setup
  scene = new THREE.Scene();
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

  // Pins (static bodies)
  const pinMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  for (let i = 0; i < 4; i++) {
    const pinMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), pinMaterial);
    pinMesh.position.set((i-2)*20, 0, 0);
    scene.add(pinMesh);

    const pinBody = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(2) });
    pinBody.position.copy(pinMesh.position);
    world.addBody(pinBody);

    pins.push({ mesh: pinMesh, body: pinBody });
  }

  // Rope (chain of segments)
  createRope(new THREE.Vector3(-20, 20, 0), new THREE.Vector3(20, 20, 0), 0xff0000);

  animate();
}

function createRope(start, end, color) {
  const segments = 10;
  const ropeMaterial = new THREE.MeshStandardMaterial({ color });
  const ropeBodies = [];
  const ropeMeshes = [];

  for (let i = 0; i < segments; i++) {
    const pos = new THREE.Vector3(
      start.x + (end.x - start.x) * (i/segments),
      start.y,
      start.z
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
      const constraint = new CANNON.DistanceConstraint(ropeBodies[i-1], body, 4);
      world.addConstraint(constraint);
    }
  }

  ropes.push({ bodies: ropeBodies, meshes: ropeMeshes });
}

function animate() {
  requestAnimationFrame(animate);
  world.step(1/60);

  // Sync physics → visuals
  ropes.forEach(rope => {
    rope.meshes.forEach((mesh, i) => {
      mesh.position.copy(rope.bodies[i].position);
    });
  });

  renderer.render(scene, camera);
}

init();
