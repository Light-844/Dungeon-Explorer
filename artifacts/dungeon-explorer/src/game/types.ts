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

export type ItemType = 'heal' | 'buff' | 'attack' | 'key' | 'material' | 'revive';

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
}

export interface EnemyInstance extends EnemyTemplate {
  instanceId: string;
  stats: Stats;
  defending: boolean;
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
  | 'start';

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
}

export interface PlayerCharacter {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  baseStats: Stats;
  equipment: Partial<Record<EquipSlot, Equipment>>;
  skillIds: string[];
  inventory: InventoryStack[];
}

export type GameMode = 'title' | 'exploring' | 'battle' | 'gameover' | 'victory';

export type BattleActionType = 'attack' | 'skill' | 'item' | 'defend' | 'flee';

export interface BattleLogEntry {
  id: string;
  text: string;
  tone: 'info' | 'damage' | 'heal' | 'crit' | 'system';
}
