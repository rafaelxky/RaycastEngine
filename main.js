import {
  map,
  MAX_DEPTH,
  wallDistances,
  isWall,
  castRay,
  renderWalls,
  normalizeAngle,
  angleDifference
} from './raycast.js';

// Canvas setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const NUM_RAYS = canvas.width;

// Player object
const player = {
  x: TILE_SIZE * 1.5,
  y: TILE_SIZE * 1.5,
  angle: 0,
  moveSpeed: 2.5,
  radius: 10,
};

// Keys pressed
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', e => {
  if (e.key === 'w') keys.w = true;
  if (e.key === 'a') keys.a = true;
  if (e.key === 's') keys.s = true;
  if (e.key === 'd') keys.d = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'w') keys.w = false;
  if (e.key === 'a') keys.a = false;
  if (e.key === 's') keys.s = false;
  if (e.key === 'd') keys.d = false;
});

// Enemy setup
const enemies = [
  { x: TILE_SIZE * 3.5, y: TILE_SIZE * 2.5, alive: true },
  { x: TILE_SIZE * 5.5, y: TILE_SIZE * 4.5, alive: true },
];

// Check line of sight between player and enemy, avoid drawing if occluded
function hasLineOfSight(enemy, player, map) {
  let dx = enemy.x - player.x;
  let dy = enemy.y - player.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(dist / 2);
  for (let i = 0; i < steps; i++) {
    let x = player.x + (dx * i) / steps;
    let y = player.y + (dy * i) / steps;
    if (isWall(x, y, map)) return false;
  }
  return true;
}

// Shoot enemies
function shoot(enemies, player) {
  for (let enemy of enemies) {
    if (!enemy.alive) continue;
    let dx = enemy.x - player.x;
    let dy = enemy.y - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      let angleToEnemy = Math.atan2(dy, dx);
      let diff = angleDifference(angleToEnemy, player.angle);
      if (Math.abs(diff) < 0.1) { // close to center
        enemy.alive = false;
      }
    }
  }
}

// Render enemies with occlusion checking
function renderEnemies(ctx, player, enemies, wallDistances, NUM_RAYS, FOV, TILE_SIZE, canvas) {
  for (let enemy of enemies) {
    if (!enemy.alive) continue;
    if (!hasLineOfSight(enemy, player, map)) continue;

    let dx = enemy.x - player.x;
    let dy = enemy.y - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let angleToEnemy = Math.atan2(dy, dx);
    let angleDiff = angleDifference(angleToEnemy, player.angle);

    if (Math.abs(angleDiff) < FOV / 2) {
      let screenX = ((angleDiff + FOV / 2) / FOV) * canvas.width;
      let size = (TILE_SIZE * 300) / dist;

      let rayCenter = Math.floor(((angleDiff + FOV / 2) / FOV) * NUM_RAYS);
      let halfRays = Math.floor(size / 2);

      let occludedRays = 0;
      let totalRays = 0;
      for (let r = rayCenter - halfRays; r <= rayCenter + halfRays; r++) {
        if (r < 0 || r >= NUM_RAYS) continue;
        totalRays++;
        if (dist > wallDistances[r]) occludedRays++;
      }

      if (totalRays === 0 || occludedRays / totalRays < 0.5) {
        ctx.fillStyle = 'red';
        ctx.fillRect(screenX - size / 2, canvas.height / 2 - size / 2, size, size);
      }
    }
  }
}

// Movement with collision detection
function movePlayer(dx, dy, map) {
  let nextX = player.x + dx;
  let nextY = player.y + dy;
  if (!isWall(nextX, player.y, map)) player.x = nextX;
  if (!isWall(player.x, nextY, map)) player.y = nextY;
}

// Pointer lock mouse control
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
canvas.onclick = () => canvas.requestPointerLock();

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    document.addEventListener('mousemove', onMouseMove);
  } else {
    document.removeEventListener('mousemove', onMouseMove);
  }
});
function onMouseMove(e) {
  player.angle += e.movementX * 0.002; // invert by making negative e.movementX if you want
  player.angle = normalizeAngle(player.angle);
}

// Shoot on mouse left click
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) shoot(enemies, player);
});

// Game loop
function gameLoop() {
  let dx = 0, dy = 0;
  if (keys.w) { dx += Math.cos(player.angle) * player.moveSpeed; dy += Math.sin(player.angle) * player.moveSpeed; }
  if (keys.s) { dx -= Math.cos(player.angle) * player.moveSpeed; dy -= Math.sin(player.angle) * player.moveSpeed; }
  if (keys.a) { dx += Math.cos(player.angle - Math.PI / 2) * player.moveSpeed; dy += Math.sin(player.angle - Math.PI / 2) * player.moveSpeed; }
  if (keys.d) { dx += Math.cos(player.angle + Math.PI / 2) * player.moveSpeed; dy += Math.sin(player.angle + Math.PI / 2) * player.moveSpeed; }

  movePlayer(dx, dy, map);

  renderWalls(ctx, player, map, canvas, NUM_RAYS, FOV, TILE_SIZE);
  renderEnemies(ctx, player, enemies, wallDistances, NUM_RAYS, FOV, TILE_SIZE, canvas);

  // Draw player info on top right
  ctx.fillStyle = 'white';
  ctx.font = '16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`X: ${player.x.toFixed(1)} Y: ${player.y.toFixed(1)} Angle: ${(player.angle * 180 / Math.PI).toFixed(1)}°`, canvas.width - 10, 20);

  requestAnimationFrame(gameLoop);
}

gameLoop();
