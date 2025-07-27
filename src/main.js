import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

// Particle count
const PARTICLE_COUNT = 30000
const radius = 1.5

// Geometry buffers
const geometry = new THREE.BufferGeometry()
const positions = new Float32Array(PARTICLE_COUNT * 3)

// Store current particle positions (THREE.Vector3) for easy manipulation
const particlePositions = []

// Initialize particles randomly on the sphere surface
for (let i = 0; i < PARTICLE_COUNT; i++) {
  // Random point on sphere
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const x = radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.sin(phi) * Math.sin(theta)
  const z = radius * Math.cos(phi)

  particlePositions.push(new THREE.Vector3(x, y, z))

  positions[i * 3] = x
  positions[i * 3 + 1] = y
  positions[i * 3 + 2] = z
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

// Material and points
const material = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.03 })
const points = new THREE.Points(geometry, material)
scene.add(points)

// Noise setup
const noise = new ImprovedNoise()
const eps = 0.0001
let time = 0

// Helper: sample 3D vector noise field at position p
function sampleNoise(p) {
  return new THREE.Vector3(
    noise.noise(p.x, p.y, p.z),
    noise.noise(p.y + 100, p.z + 100, p.x + 100), // offset to decorrelate channels
    noise.noise(p.z + 200, p.x + 200, p.y + 200)
  )
}

// Compute curl noise at position p using central differences
function curlNoise(p) {
  const dx = new THREE.Vector3(eps, 0, 0)
  const dy = new THREE.Vector3(0, eps, 0)
  const dz = new THREE.Vector3(0, 0, eps)

  const n1 = sampleNoise(p.clone().add(dy))
  const n2 = sampleNoise(p.clone().sub(dy))
  const a = (n1.z - n2.z) / (2 * eps)
  const b = (n1.x - n2.x) / (2 * eps)

  const n3 = sampleNoise(p.clone().add(dz))
  const n4 = sampleNoise(p.clone().sub(dz))
  const c = (n3.y - n4.y) / (2 * eps)
  const d = (n3.x - n4.x) / (2 * eps)

  const n5 = sampleNoise(p.clone().add(dx))
  const n6 = sampleNoise(p.clone().sub(dx))
  const e = (n5.y - n6.y) / (2 * eps)
  const f = (n5.z - n6.z) / (2 * eps)

  return new THREE.Vector3(a - c, d - f, e - b)
}
function animate() {
  requestAnimationFrame(animate)
  time += 0.005

  const positions = geometry.attributes.position.array

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particlePositions[i]

    // Add time offset to position for animated noise
    const noisePos = new THREE.Vector3(
      p.x + time,
      p.y + time,
      p.z + time
    )

    // Curl noise velocity
    const velocity = curlNoise(noisePos)
    velocity.multiplyScalar(0.02)

    // Move particle by velocity
    p.add(velocity)

    // Normalize direction (unit vector from center)
    const dir = p.clone().normalize()

    // Add subtle noise-based radius offset for organic variation
    const offset = noise.noise(
      dir.x * 5 + time * 2,
      dir.y * 5 + time * 2,
      dir.z * 5 + time * 2
    ) * 0.3 // tweak 0.1 for more/less offset

    // New radius with noise offset
    const r = radius + offset

    // Project particle to noisy radius along direction
    p.copy(dir.multiplyScalar(r))

    // Update positions buffer
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
  }

  geometry.attributes.position.needsUpdate = true
  controls.update()
  renderer.render(scene, camera)
}

animate()
