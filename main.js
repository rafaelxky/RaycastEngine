export let score = {value: 0};

import {
  map,
  MAX_DEPTH,
  wallDistances,
  isWall,
  castRay,
  renderWalls,
  normalizeAngle,
  angleDifference,
} from './raycast.js';

import { hasLineOfSight, shoot, renderEnemies, enemies } from './enemy.js';

// Canvas setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 1080;
canvas.height = 600;

const TILE_SIZE = 64;
const FOV = Math.PI;
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

// Load gun image
const gunImage = new Image();
gunImage.src = 'gun.png';

const flashImage = new Image();
flashImage.src = 'flash.png';

const FLASH_DURATION = 5; // frames
let flashTime = 0;

// Gun animation variables
let gunRecoilTime = 0;         // time left for recoil animation in frames
const GUN_RECOIL_DURATION = 15; // frames duration for recoil animation
const GUN_BASE_Y = canvas.height - 120; // base vertical position of the gun image
const GUN_X = canvas.width / 2;           // horizontal center

// On mouse down (left click), start recoil animation and shoot
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) {
    shoot(enemies, player);
    gunRecoilTime = GUN_RECOIL_DURATION;
    flashTime = FLASH_DURATION;
  }
});

// Draw gun with recoil animation
function drawGun() {
  if (!gunImage.complete) return;

  let recoilOffset = 0;
  if (gunRecoilTime > 0) {
    const progress = (GUN_RECOIL_DURATION - gunRecoilTime) / GUN_RECOIL_DURATION;
    recoilOffset = -10 * Math.sin(progress * Math.PI);
  }

  const gunWidth = 200;
  const aspectRatio = gunImage.height / gunImage.width;
  const gunHeight = gunWidth * aspectRatio;

  const drawX = GUN_X - gunWidth / 2;
  const drawY = GUN_BASE_Y + recoilOffset;

  ctx.drawImage(gunImage, drawX, drawY, gunWidth, gunHeight);

  // Draw muzzle flash
  if (flashTime > 0 && flashImage.complete) {
    const flashWidth = 80;
    const flashAspect = flashImage.height / flashImage.width;
    const flashHeight = flashWidth * flashAspect;

    // Flash appears slightly above the gun muzzle
    const flashX = GUN_X - flashWidth / 2;
    const flashY = drawY - flashHeight + 10;

    ctx.drawImage(flashImage, flashX, flashY, flashWidth, flashHeight);
    flashTime--;
  }

  if (gunRecoilTime > 0) gunRecoilTime--;
}

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

  ctx.textAlign = "left";
  ctx.fillText(score.value, 10, 20);

  drawGun();

  requestAnimationFrame(gameLoop);
}

gameLoop();
