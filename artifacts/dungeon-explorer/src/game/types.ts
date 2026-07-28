// Core type definitions for Dungeon Explorer

export interface Stats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
  luck: number;
}

export type Element = 'fire' | 'ice' | 'lightning' | 'earth' | 'holy' | 'poison' | 'none';

export type SkillType = 'physical' | 'magic' | 'support';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  mpCost: number;
  power: number;
  element: Element;
  description: string;
  unlockLevel: number;
  target: 'enemy' | 'self' | 'allEnemies';
  statBuff?: Partial<Record<keyof Stats, number>>;
  healAmount?: number;
}

export type ItemType = 'heal' | 'buff' | 'attack' | 'key' | 'material' | 'revive' | 'bossCore';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  healAmount?: number;
  mpAmount?: number;
  buffStat?: keyof Stats;
  buffAmount?: number;
  damage?: number;
  element?: Element;
  value: number;
  /** If set, consuming this item grants terrain resistance for `resistSeconds`. */
  terrainResist?: 'hot' | 'cold' | 'swamp' | 'all';
  resistSeconds?: number;
  /** Boss core only: the skill ID granted on consume (if not already learned). */
  grantSkillId?: string;
  /** Boss core only: stat bonus applied if the skill is already known. */
  fallbackStatBonus?: Partial<Record<keyof Stats, number>>;
}

export interface InventoryStack {
  item: Item;
  quantity: number;
}

export type EquipSlot = 'weapon' | 'armor' | 'accessory';

export interface Equipment {
  id: string;
  name: string;
  slot: EquipSlot;
  statBonus: Partial<Record<keyof Stats, number>>;
  description: string;
  value: number;
  /** Unique per-instance id, assigned when an equipment piece is looted so duplicates can coexist in inventory. */
  instanceUid?: string;
  /** Number of times this specific instance has been upgraded at the forge. */
  upgradeLevel?: number;
}

export interface LootDrop {
  /** Consumable item id to drop. */
  itemId?: string;
  /** Equipment id to drop (goes to the player's spare gear inventory). */
  equipmentId?: string;
  /** 0-1 probability this drop is rolled independently of other entries. */
  chance: number;
  min?: number;
  max?: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  baseStats: Stats;
  xpReward: number;
  goldReward: number;
  weakness?: Element;
  resist?: Element;
  skillIds: string[];
  color: string;
  isBoss?: boolean;
  /** Thematic drops rolled independently on defeat (e.g. a Rock Golem drops a Golem Core). */
  lootTable?: LootDrop[];
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  resultItemId: string;
  resultQty: number;
  materials: { itemId: string; qty: number }[];
  goldCost: number;
}

export interface EnemyInstance extends EnemyTemplate {
  instanceId: string;
  stats: Stats;
  defending: boolean;
  /** Display level, derived from the dungeon floor the enemy spawned on. */
  level: number;
}

export interface DungeonTheme {
  id: string;
  name: string;
  description: string;
  floorColor: string;
  wallColor: string;
  accentColor: string;
  fogColor: string;
  enemyIds: string[];
  bossId: string;
}

export type TileType =
  | 'wall'
  | 'floor'
  | 'door'
  | 'lockedDoor'
  | 'chest'
  | 'openedChest'
  | 'stairsDown'
  | 'trap'
  | 'triggeredTrap'
  | 'shop'
  | 'enemy'
  | 'start'
  | 'lavaTile'
  | 'iceTile'
  | 'mudTile';

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  enemyInstanceId?: string;
  lootId?: string;
  discovered: boolean;
}

export interface DungeonRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  isBossRoom?: boolean;
  isShopRoom?: boolean;
}

export interface DungeonLevel {
  floor: number;
  width: number;
  height: number;
  tiles: Tile[][];
  theme: DungeonTheme;
  rooms: DungeonRoom[];
  startPos: { x: number; y: number };
  enemies: Record<string, EnemyInstance>;
  /** Instance id of this floor's boss — the Dungeon Key it drops is required to descend. */
  bossInstanceId: string | null;
  /** Position of the locked door guarding the boss room, unlocked when all non-boss enemies die. */
  bossDoorPos: { x: number; y: number } | null;
}

export interface PlayerCharacter {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  baseStats: Stats;
  equipment: Partial<Record<EquipSlot, Equipment>>;
  /** Spare gear not currently worn — equip/unequip freely from the inventory screen. */
  equipmentInventory: Equipment[];
  skillIds: string[];
  inventory: InventoryStack[];
  /** Unspent points earned on level-up, 5 per level, freely assignable to any stat. */
  statPoints: number;
}

export type GameMode = 'title' | 'exploring' | 'battle' | 'gameover' | 'victory';

export type BattleActionType = 'attack' | 'skill' | 'item' | 'defend' | 'flee';

export interface BattleLogEntry {
  id: string;
  text: string;
  tone: 'info' | 'damage' | 'heal' | 'crit' | 'system';
}
