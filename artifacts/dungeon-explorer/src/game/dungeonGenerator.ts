import { ENEMIES, THEMES } from './gameData';
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
  return {
    ...template,
    instanceId: `${enemyId}-${Math.random().toString(36).slice(2, 9)}`,
    stats,
    defending: false,
    level: floor,
  };
}

export function pickTheme(floor: number): DungeonTheme {
  return THEMES[(floor - 1) % THEMES.length]!;
}

/** Find a corridor tile just outside the boss room to use as the locked door. */
function findBossDoorTile(
  grid: Tile[][],
  bossRoom: DungeonRoom,
): { x: number; y: number } | null {
  // Walk the perimeter of the boss room and look one tile further out in each
  // cardinal direction — those are the corridor tiles connecting it to the rest.
  const candidates: { x: number; y: number }[] = [];

  // Top and bottom edges
  for (let x = bossRoom.x; x < bossRoom.x + bossRoom.w; x++) {
    const above = grid[bossRoom.y - 1]?.[x];
    if (above && above.type === 'floor') candidates.push({ x, y: bossRoom.y - 1 });
    const below = grid[bossRoom.y + bossRoom.h]?.[x];
    if (below && below.type === 'floor') candidates.push({ x, y: bossRoom.y + bossRoom.h });
  }
  // Left and right edges
  for (let y = bossRoom.y; y < bossRoom.y + bossRoom.h; y++) {
    const left = grid[y]?.[bossRoom.x - 1];
    if (left && left.type === 'floor') candidates.push({ x: bossRoom.x - 1, y });
    const right = grid[y]?.[bossRoom.x + bossRoom.w];
    if (right && right.type === 'floor') candidates.push({ x: bossRoom.x + bossRoom.w, y });
  }

  if (candidates.length === 0) return null;
  // Pick the candidate closest to the middle of the list for a stable position.
  return candidates[Math.floor(candidates.length / 2)]!;
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

  // Connect rooms in order with corridors (simple chain + a few extra links)
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = roomCenter(rooms[i]!);
    const b = roomCenter(rooms[i + 1]!);
    if (Math.random() < 0.5) {
      carveCorridor(grid, a.x, a.y, b.x, a.y);
      carveCorridor(grid, b.x, a.y, b.x, b.y);
    } else {
      carveCorridor(grid, a.x, a.y, a.x, b.y);
      carveCorridor(grid, a.x, b.y, b.x, b.y);
    }
  }
  // A couple of extra random links for loops
  for (let i = 0; i < 2 && rooms.length > 3; i++) {
    const a = roomCenter(randChoice(rooms));
    const b = roomCenter(randChoice(rooms));
    carveCorridor(grid, a.x, a.y, b.x, a.y);
    carveCorridor(grid, b.x, a.y, b.x, b.y);
  }

  // ── Boss room door ──────────────────────────────────────────────────────────
  // Place a locked door on the corridor tile just outside the boss room.
  // It turns walkable once all regular mobs on this floor are defeated.
  const bossDoorTile = findBossDoorTile(grid, endRoom);
  if (bossDoorTile) {
    grid[bossDoorTile.y]![bossDoorTile.x]!.type = 'lockedDoor';
  }

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

  // Place stairs down in the room right before the boss room.
  const stairsRoom = rooms[Math.max(0, rooms.length - 2)]!;
  const stairsCenter = roomCenter(stairsRoom);
  const stairsSpot = findNearestPlainFloor(grid, stairsCenter, width, height);
  if (stairsSpot) {
    grid[stairsSpot.y]![stairsSpot.x]!.type = 'stairsDown';
  }

  const startCenter = roomCenter(startRoom);

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

export function tileTypeIsWalkable(type: TileType): boolean {
  return type !== 'wall' && type !== 'lockedDoor';
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
