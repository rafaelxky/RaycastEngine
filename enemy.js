import { map, isWall, angleDifference, wallDistances } from './raycast.js';

export const enemies = [];

// Spawn enemy only if tile is empty (not a wall)
export function spawnEnemy(x, y) {
  const mapX = Math.floor(x / 64);
  const mapY = Math.floor(y / 64);
  if (map[mapY]?.[mapX] === 0) {
    enemies.push({ x, y, alive: true });
  } else {
    console.warn("Tried to spawn enemy in wall!");
  }
}

// Example initial spawns
spawnEnemy(64 * 2.5, 64 * 1.5);
spawnEnemy(64 * 5.5, 64 * 3.5);
spawnEnemy(64 * 7, 64 * 12);
spawnEnemy(64 * 2, 64 * 7);

// Bresenham’s line for quick LOS tile check
function hasLineOfSightBresenham(enemy, player, map) {
  let x0 = Math.floor(player.x / 64);
  let y0 = Math.floor(player.y / 64);
  let x1 = Math.floor(enemy.x / 64);
  let y1 = Math.floor(enemy.y / 64);

  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (map[y0]?.[x0] === 1) return false; // Wall blocking sight
    if (x0 === x1 && y0 === y1) break;

    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return true;
}

// Fine-grained LOS by checking each pixel along line
export function hasLineOfSight(enemy, player, map) {
  if (!hasLineOfSightBresenham(enemy, player, map)) return false;

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

// Shoot enemy if close and near center
export function shoot(enemies, player) {
  for (let enemy of enemies) {
    if (!enemy.alive) continue;
    let dx = enemy.x - player.x;
    let dy = enemy.y - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      let angleToEnemy = Math.atan2(dy, dx);
      let diff = angleDifference(angleToEnemy, player.angle);
      if (Math.abs(diff) < 0.8) {
        enemy.alive = false;
      }
    }
  }
}

// Draw enemies with improved occlusion
export function renderEnemies(ctx, player, enemies, wallDistances, NUM_RAYS, FOV, TILE_SIZE, canvas) {
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
