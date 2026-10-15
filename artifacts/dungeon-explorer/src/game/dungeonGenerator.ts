import { ENEMIES, FLOOR4_ENEMY_SKILLS, THEMES } from './gameData';
import type {
  DungeonLevel,
  DungeonRoom,
  DungeonTheme,
  EnemyInstance,
  Tile,
  TileType,
} from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function makeGrid(width: number, height: number): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ type: 'wall', x, y, discovered: false });
    }
    grid.push(row);
  }
  return grid;
}

function carveRoom(grid: Tile[][], room: DungeonRoom) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (grid[y] && grid[y][x]) {
        grid[y][x]!.type = 'floor';
      }
    }
  }
}

function carveCorridor(grid: Tile[][], x1: number, y1: number, x2: number, y2: number) {
  let x = x1;
  let y = y1;
  const setFloor = (px: number, py: number) => {
    const row = grid[py];
    if (row && row[px] && row[px]!.type === 'wall') {
      row[px]!.type = 'floor';
    }
  };
  while (x !== x2) {
    setFloor(x, y);
    x += x2 > x ? 1 : -1;
  }
  while (y !== y2) {
    setFloor(x, y);
    y += y2 > y ? 1 : -1;
  }
  setFloor(x, y);
}

function roomCenter(room: DungeonRoom): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function roomsOverlap(a: DungeonRoom, b: DungeonRoom, padding = 1): boolean {
  return (
    a.x - padding < b.x + b.w &&
    a.x + a.w + padding > b.x &&
    a.y - padding < b.y + b.h &&
    a.y + a.h + padding > b.y
  );
}

function spawnEnemy(enemyId: string, floor: number): EnemyInstance {
  const template = ENEMIES[enemyId]!;
  const scale = 1 + (floor - 1) * 0.22;
  const stats = {
    ...template.baseStats,
    hp: Math.round(template.baseStats.hp * scale),
    maxHp: Math.round(template.baseStats.maxHp * scale),
    atk: Math.round(template.baseStats.atk * scale),
    def: Math.round(template.baseStats.def * scale),
    matk: Math.round(template.baseStats.matk * scale),
    mdef: Math.round(template.baseStats.mdef * scale),
    spd: template.baseStats.spd,
    luck: template.baseStats.luck,
    mp: template.baseStats.mp,
    maxMp: template.baseStats.maxMp,
  };

  // On floor 4+, inject an elemental skill into regular (non-boss) enemies.
  let skillIds = [...template.skillIds];
  if (floor >= 4 && !template.isBoss) {
    const extraSkill = FLOOR4_ENEMY_SKILLS[enemyId];
    if (extraSkill && !skillIds.includes(extraSkill)) {
      skillIds = [...skillIds, extraSkill];
    }
  }

  return {
    ...template,
    instanceId: `${enemyId}-${Math.random().toString(36).slice(2, 9)}`,
    stats,
    defending: false,
    level: floor,
    skillIds,
  };
}

export function pickTheme(floor: number): DungeonTheme {
  return THEMES[(floor - 1) % THEMES.length]!;
}

/**
 * Seal EVERY floor tile on the perimeter outside the boss room to walls,
 * except for one — which becomes the single locked-door gate.
 *
 * Rooms are sorted left-to-right so the chain corridor from the previous room
 * enters from the LEFT edge. We prefer a left-edge candidate so the gate
 * sits at the natural approach to the boss room.
 */
function sealBossRoomToSingleEntry(
  grid: Tile[][],
  bossRoom: DungeonRoom,
): { x: number; y: number } | null {
  const leftEdge: { x: number; y: number }[] = [];
  const otherEdges: { x: number; y: number }[] = [];

  // Left edge — preferred because rooms are sorted ascending on X
  for (let y = bossRoom.y; y < bossRoom.y + bossRoom.h; y++) {
    const t = grid[y]?.[bossRoom.x - 1];
    if (t && t.type === 'floor') leftEdge.push({ x: bossRoom.x - 1, y });
  }
  // Top edge
  for (let x = bossRoom.x - 1; x <= bossRoom.x + bossRoom.w; x++) {
    const t = grid[bossRoom.y - 1]?.[x];
    if (t && t.type === 'floor') otherEdges.push({ x, y: bossRoom.y - 1 });
  }
  // Bottom edge
  for (let x = bossRoom.x - 1; x <= bossRoom.x + bossRoom.w; x++) {
    const t = grid[bossRoom.y + bossRoom.h]?.[x];
    if (t && t.type === 'floor') otherEdges.push({ x, y: bossRoom.y + bossRoom.h });
  }
  // Right edge
  for (let y = bossRoom.y; y < bossRoom.y + bossRoom.h; y++) {
    const t = grid[y]?.[bossRoom.x + bossRoom.w];
    if (t && t.type === 'floor') otherEdges.push({ x: bossRoom.x + bossRoom.w, y });
  }

  const all = [...leftEdge, ...otherEdges];
  if (all.length === 0) return null;

  // The gate: use the middle of the left-edge entries, or the middle of all if none on left
  const gateSource = leftEdge.length > 0 ? leftEdge : all;
  const chosen = gateSource[Math.floor(gateSource.length / 2)]!;

  // Wall off every other perimeter entry — this enforces the single-entry rule
  for (const c of all) {
    if (c.x === chosen.x && c.y === chosen.y) continue;
    grid[c.y]![c.x]!.type = 'wall';
  }

  // Mark the single gate as a locked door
  grid[chosen.y]![chosen.x]!.type = 'lockedDoor';
  return chosen;
}

/** Scatter elemental terrain tiles across non-boss, non-shop rooms for themed floors. */
function scatterTerrainTiles(
  grid: Tile[][],
  rooms: DungeonRoom[],
  terrainType: TileType,
  count: number,
) {
  const candidates: { x: number; y: number }[] = [];
  for (const room of rooms) {
    if (room.isBossRoom || room.isShopRoom) continue;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (grid[y]?.[x]?.type === 'floor') {
          candidates.push({ x, y });
        }
      }
    }
  }
  // Shuffle and pick `count` tiles
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    const { x, y } = candidates[i]!;
    grid[y]![x]!.type = terrainType;
  }
}

export function generateDungeonLevel(floor: number): DungeonLevel {
  const width = 27;
  const height = 21;
  const grid = makeGrid(width, height);
  const theme = pickTheme(floor);

  const rooms: DungeonRoom[] = [];
  const maxRooms = randInt(8, 11);
  let attempts = 0;

  while (rooms.length < maxRooms && attempts < 200) {
    attempts++;
    const w = randInt(3, 6);
    const h = randInt(3, 5);
    const x = randInt(1, width - w - 2);
    const y = randInt(1, height - h - 2);
    const candidate: DungeonRoom = { x, y, w, h };
    if (rooms.some((r) => roomsOverlap(r, candidate))) continue;
    rooms.push(candidate);
  }

  // First room is the start room, last room is always the boss room.
  rooms.sort((a, b) => a.x - b.x);
  const startRoom = rooms[0]!;
  const endRoom = rooms[rooms.length - 1]!;
  endRoom.isBossRoom = true;
  if (rooms.length > 2) {
    rooms[Math.floor(rooms.length / 2)]!.isShopRoom = Math.random() < 0.4;
  }

  rooms.forEach((room) => carveRoom(grid, room));

  // Connect every room in one guaranteed main chain. The stairs room is chosen
  // from this exact chain below, so extra maze links can never be its only route.
  const mainCorridorChain = [...rooms];
  for (let i = 0; i < mainCorridorChain.length - 1; i++) {
    const a = roomCenter(mainCorridorChain[i]!);
    const b = roomCenter(mainCorridorChain[i + 1]!);
    if (Math.random() < 0.5) {
      carveCorridor(grid, a.x, a.y, b.x, a.y);
      carveCorridor(grid, b.x, a.y, b.x, b.y);
    } else {
      carveCorridor(grid, a.x, a.y, a.x, b.y);
      carveCorridor(grid, a.x, b.y, b.x, b.y);
    }
  }
  // A couple of extra random links for loops — exclude the boss room so we
  // never carve an unexpected second path into it.
  const nonBossRooms = rooms.filter((r) => !r.isBossRoom);
  for (let i = 0; i < 2 && nonBossRooms.length > 3; i++) {
    const a = roomCenter(randChoice(nonBossRooms));
    const b = roomCenter(randChoice(nonBossRooms));
    carveCorridor(grid, a.x, a.y, b.x, a.y);
    carveCorridor(grid, b.x, a.y, b.x, b.y);
  }

  // ── Boss room — seal all perimeter entries except one locked gate ───────────
  const bossDoorTile = sealBossRoomToSingleEntry(grid, endRoom);

  const enemies: Record<string, EnemyInstance> = {};
  let bossInstanceId: string | null = null;

  // Populate rooms with content
  rooms.forEach((room, idx) => {
    const center = roomCenter(room);
    if (idx === 0) {
      grid[center.y]![center.x]!.type = 'start';
      return;
    }

    if (room.isBossRoom) {
      const boss = spawnEnemy(theme.bossId, floor);
      enemies[boss.instanceId] = boss;
      bossInstanceId = boss.instanceId;
      grid[center.y]![center.x]!.type = 'enemy';
      grid[center.y]![center.x]!.enemyInstanceId = boss.instanceId;
      return;
    }

    if (room.isShopRoom) {
      grid[center.y]![center.x]!.type = 'shop';
      return;
    }

    // Regular room: maybe an enemy, maybe a chest, maybe a trap
    const roll = Math.random();
    const tilesInRoom: { x: number; y: number }[] = [];
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x === center.x && y === center.y) continue;
        tilesInRoom.push({ x, y });
      }
    }

    if (roll < 0.55) {
      const enemyId = randChoice(theme.enemyIds);
      const enemy = spawnEnemy(enemyId, floor);
      enemies[enemy.instanceId] = enemy;
      const spot = randChoice(tilesInRoom);
      grid[spot.y]![spot.x]!.type = 'enemy';
      grid[spot.y]![spot.x]!.enemyInstanceId = enemy.instanceId;
    } else if (roll < 0.85) {
      const spot = randChoice(tilesInRoom);
      grid[spot.y]![spot.x]!.type = 'chest';
    } else {
      const spot = randChoice(tilesInRoom);
      grid[spot.y]![spot.x]!.type = 'trap';
    }

    // Small chance of a bonus chest too
    if (Math.random() < 0.25 && tilesInRoom.length > 2) {
      const spot = randChoice(tilesInRoom);
      if (grid[spot.y]![spot.x]!.type === 'floor') {
        grid[spot.y]![spot.x]!.type = 'chest';
      }
    }
  });

  // ── Reachability guard ──────────────────────────────────────────────────────
  // Remove any non-boss enemy whose tile cannot be reached from the start
  // without unlocking the boss door. This catches mobs that ended up on the
  // wrong side of the seal due to corridor routing quirks.
  const startCenter = roomCenter(startRoom);
  {
    const reachable = reachableWithoutBossKey(grid, startCenter, width, height);
    // (startCenter is also reused below for the DungeonLevel startPos)
    for (const [instanceId, _enemy] of Object.entries(enemies)) {
      if (instanceId === bossInstanceId) continue; // boss is intentionally locked
      // Find this enemy's tile
      let found = false;
      outer: for (let ey = 0; ey < height; ey++) {
        for (let ex = 0; ex < width; ex++) {
          if (grid[ey]![ex]!.enemyInstanceId === instanceId) {
            if (!reachable.has(`${ex},${ey}`)) {
              // Trapped — clear the tile and remove from the enemy record
              grid[ey]![ex]!.type = 'floor';
              grid[ey]![ex]!.enemyInstanceId = undefined;
              delete enemies[instanceId];
            }
            found = true;
            break outer;
          }
        }
      }
      if (!found) delete enemies[instanceId]; // orphaned record
    }
  }

  // Place stairs in the main-chain room immediately before the boss room.
  // Each candidate is checked against the pre-boss reachable area. If random
  // retries cannot find a valid tile, fall back to a reachable start-room tile.
  const reachableForStairs = reachableWithoutBossKey(grid, startCenter, width, height);
  const stairsRoom =
    mainCorridorChain[Math.max(0, mainCorridorChain.length - 2)] ?? startRoom;
  const stairsSpot =
    findReachablePlainFloorInRoom(grid, stairsRoom, reachableForStairs, 16) ??
    findReachablePlainFloorInRoom(grid, startRoom, reachableForStairs, 16) ??
    findNearestReachablePlainFloor(
      grid,
      startCenter,
      reachableForStairs,
      width,
      height,
    );

  if (stairsSpot) {
    grid[stairsSpot.y]![stairsSpot.x]!.type = 'stairsDown';
  }

  // ── Elemental terrain tiles ─────────────────────────────────────────────────
  // Scatter per-theme terrain tiles so the floor feels hazardous and unique.
  const terrainCount = randInt(5, 9);
  if (theme.id === 'lavaCavern') {
    scatterTerrainTiles(grid, rooms, 'lavaTile', terrainCount);
  } else if (theme.id === 'frozenCatacombs') {
    scatterTerrainTiles(grid, rooms, 'iceTile', terrainCount);
  } else if (theme.id === 'undergroundSwamp') {
    scatterTerrainTiles(grid, rooms, 'mudTile', terrainCount);
  }

  return {
    floor,
    width,
    height,
    tiles: grid,
    theme,
    rooms,
    startPos: startCenter,
    enemies,
    bossInstanceId,
    bossDoorPos: bossDoorTile ?? null,
  };
}

/**
 * BFS flood-fill from `start`, treating `lockedDoor` (and walls) as impassable.
 * Returns the set of tile keys ("x,y") reachable without the boss key.
 */
function reachableWithoutBossKey(
  grid: Tile[][],
  start: { x: number; y: number },
  width: number,
  height: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ ...start }];
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      const t = grid[ny]?.[nx];
      if (!t || t.type === 'wall' || t.type === 'lockedDoor') continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return visited;
}

/**
 * Try random plain-floor tiles inside a room, accepting only tiles reachable
 * from the start while the boss door is locked.
 */
function findReachablePlainFloorInRoom(
  grid: Tile[][],
  room: DungeonRoom,
  reachable: Set<string>,
  maxAttempts: number,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (grid[y]?.[x]?.type === 'floor') {
        candidates.push({ x, y });
      }
    }
  }

  for (let attempt = 0; attempt < maxAttempts && candidates.length > 0; attempt++) {
    const index = randInt(0, candidates.length - 1);
    const candidate = candidates.splice(index, 1)[0]!;
    if (reachable.has(`${candidate.x},${candidate.y}`)) {
      return candidate;
    }
  }
  return null;
}

/** Final fallback: nearest reachable plain floor around the player start. */
function findNearestReachablePlainFloor(
  grid: Tile[][],
  origin: { x: number; y: number },
  reachable: Set<string>,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const visited = new Set<string>([`${origin.x},${origin.y}`]);
  const queue: { x: number; y: number }[] = [{ ...origin }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const tile = grid[current.y]?.[current.x];
    if (
      tile?.type === 'floor' &&
      reachable.has(`${current.x},${current.y}`)
    ) {
      return current;
    }

    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (
        x < 0 ||
        y < 0 ||
        x >= width ||
        y >= height ||
        visited.has(key) ||
        !reachable.has(key)
      ) {
        continue;
      }
      visited.add(key);
      queue.push({ x, y });
    }
  }
  return null;
}

export function tileTypeIsWalkable(type: TileType): boolean {
  return (
    type !== 'wall' &&
    type !== 'lockedDoor'
  );
}

// BFS outward from `origin` for the nearest tile that is a plain, unoccupied floor.
function findNearestPlainFloor(
  grid: Tile[][],
  origin: { x: number; y: number },
  width: number,
  height: number,
): { x: number; y: number } | null {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [origin];
  visited.add(`${origin.x},${origin.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const tile = grid[current.y]?.[current.x];
    if (tile && tile.type === 'floor') {
      return current;
    }
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;
      if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
      const nTile = grid[n.y]?.[n.x];
      if (!nTile || nTile.type === 'wall') continue;
      visited.add(key);
      queue.push(n);
    }
  }
  return null;
}
