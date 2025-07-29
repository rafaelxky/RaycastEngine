// raycast.js - Raycasting and wall rendering logic

// The map layout (0=empty, 1=wall)
export const map = [
  [1,1,1,1,1,1,1,1], // 0
  [1,0,0,0,0,0,0,1], // 1
  [1,0,1,0,1,0,0,1], // 2
  [1,0,1,0,1,0,0,1], // 3
  [1,0,0,0,0,0,0,1], // 4
  [1,1,1,1,0,1,1,1], // 5
  [1,0,0,1,0,1,1,1], // 6
  [1,0,0,1,0,1,1,1,1,1], // 7
  [1,0,0,1,0,1,1,0,0,1], // 8
  [1,0,0,1,0,1,1,1,0,1], // 9
  [1,0,0,0,0,1,0,0,0,1], // 10
  [1,1,1,1,0,0,0,0,0,1], // 11
  [1,1,1,1,0,1,0,1,1,1], // 12
  [1,1,1,1,0,1,1,1],
];

export const MAX_DEPTH = 1000;
const usesCorrection = false;

export const wallDistances = new Array(800); 

export function isWall(x, y, map) {
  let mapX = Math.floor(x / 64);
  let mapY = Math.floor(y / 64);
  return map[mapY]?.[mapX] > 0;
}

export function normalizeAngle(a) {
  return (a + Math.PI * 2) % (Math.PI * 2);
}

export function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function castRay(angle, player, map, rayIndex, NUM_RAYS, FOV) {
  let sin = Math.sin(angle);
  let cos = Math.cos(angle);

  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    let targetX = player.x + cos * depth;
    let targetY = player.y + sin * depth;
    if (isWall(targetX, targetY, map)) {
      // Fish-eye correction: multiply by cos(rayAngle - playerAngle)
      if (usesCorrection){
        let correctedDist = depth * Math.cos(angleDifference(angle, player.angle));
        wallDistances[rayIndex] = correctedDist;
      }else {
        wallDistances[rayIndex] = depth;
      }

      return { depth };
    }
  }
  wallDistances[rayIndex] = MAX_DEPTH;
  return { depth: MAX_DEPTH };
}

export function renderWalls(ctx, player, map, canvas, NUM_RAYS, FOV, TILE_SIZE) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < NUM_RAYS; i++) {
    let rayAngle = player.angle - FOV / 2 + FOV * i / NUM_RAYS;
    let ray = castRay(rayAngle, player, map, i, NUM_RAYS, FOV);

    let correctedDist = wallDistances[i];

    let wallHeight = (TILE_SIZE * 277) / correctedDist;

    let shade = 255 - Math.min(255, correctedDist / 2);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(i, (canvas.height / 2) - wallHeight / 2, 1, wallHeight);
  }
}
