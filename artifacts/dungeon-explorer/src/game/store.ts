import { create } from 'zustand';
import {
  EQUIPMENT,
  ITEMS,
  LOOT_EQUIPMENT_POOL,
  LOOT_ITEM_POOL,
  RECIPES,
  SKILL_UNLOCK_ORDER,
  SKILLS,
} from './gameData';
import { CLASSES } from './classData';
import { generateDungeonLevel, tileTypeIsWalkable } from './dungeonGenerator';
import {
  autoStatGainsForLevelUp,
  calcMagicDamage,
  calcPhysicalDamage,
  computeEffectiveStats,
  pickEnemyAction,
  STAT_POINTS_PER_LEVEL,
  STAT_POINT_VALUE,
  xpToNextLevel,
} from './combatEngine';
import type {
  BattleLogEntry,
  DungeonLevel,
  EnemyInstance,
  EquipSlot,
  Equipment,
  GameMode,
  Item,
  PlayerCharacter,
  Skill,
  Stats,
} from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function freshPlayer(
  name = 'Adventurer',
  gender: 'male' | 'female' = 'male',
  heroClass = 'warrior',
): PlayerCharacter {
  const cls = CLASSES[heroClass] ?? CLASSES.warrior!;
  const weapon = EQUIPMENT[cls.starterWeaponId];
  const armor  = EQUIPMENT[cls.starterArmorId];
  const equipment: PlayerCharacter['equipment'] = {};
  if (weapon) equipment.weapon  = cloneEquipmentInstance(weapon);
  if (armor)  equipment.armor   = cloneEquipmentInstance(armor);

  return {
    name,
    gender,
    heroClass: cls.id,
    classAttributes: { ...cls.attributes },
    level: 1,
    xp: 0,
    xpToNext: xpToNextLevel(1),
    gold: 30,
    baseStats: { ...cls.baseStats },
    equipment,
    equipmentInventory: [],
    skillIds: [...cls.startingSkillIds],
    inventory: [{ item: ITEMS.smallPotion!, quantity: 3 }],
    statPoints: 0,
  };
}

export interface BattleState {
  enemies: EnemyInstance[];
  playerBuffs: Partial<Record<keyof Stats, number>>;
  turn: 'player' | 'enemy' | 'resolving';
  log: BattleLogEntry[];
  targetIndex: number;
  playerDefending: boolean;
  fleeAttempted: boolean;
  victory: boolean;
  originTileEnemyId: string | null;
}

/** Compute terrain timer initial value based on DEF: 100–250 seconds. */
function calcTerrainTimer(def: number): number {
  return Math.min(250, Math.max(100, 100 + def * 5));
}

/** Whether this theme triggers a terrain hazard timer (hot or cold). */
function themeHasHazard(themeId: string): boolean {
  return themeId === 'lavaCavern' || themeId === 'frozenCatacombs';
}

interface GameState {
  mode: GameMode;
  player: PlayerCharacter;
  playerHp: number;
  playerMp: number;
  dungeon: DungeonLevel | null;
  playerPos: { x: number; y: number };
  facing: 'up' | 'down' | 'left' | 'right';
  battle: BattleState | null;
  message: string | null;
  messageTone: 'info' | 'warning' | 'success';
  keysHeld: string | null;

  // ── Terrain hazard state ────────────────────────────────────────────────────
  /** Seconds remaining before hot/cold terrain begins dealing damage. null = no hazard. */
  terrainTimerSeconds: number | null;
  /** True once the timer expires — terrain now ticks damage. */
  terrainDamaging: boolean;
  /** Seconds of active terrain resistance (pauses timer & damage). 0 = none. */
  terrainResistSeconds: number;
  /** Internal counter for spacing terrain damage (damage fires every 10 s). */
  terrainDamageInterval: number;
  /** Move cooldown deadline (ms) for swamp slow. 0 = free to move. */
  swampMoveCooldownMs: number;

  startNewGame: (name: string, gender: 'male' | 'female', heroClass: string) => void;
  movePlayer: (dx: number, dy: number) => void;
  openChest: () => void;
  interactShop: () => void;
  buyFromShop: (itemId: string) => void;
  sellItem: (itemId: string) => void;
  sellEquipment: (instanceUid: string) => void;
  craftItem: (recipeId: string) => void;
  equipItem: (instanceUid: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  upgradeEquipment: (slot: EquipSlot, materialItemId: string) => void;
  allocateStatPoint: (stat: keyof Stats) => void;
  descendStairs: () => void;
  battleAction: (
    action: 'attack' | 'skill' | 'item' | 'defend' | 'flee',
    payload?: { skillId?: string; itemId?: string; targetIndex?: number },
  ) => void;
  useItem: (itemId: string) => void;
  clearMessage: () => void;
  returnToTitle: () => void;
  tickMobWander: () => void;
  mergeEquipment: (uid1: string, uid2: string) => void;
  /** Tick terrain hazard timer by one second (called every 1 s while exploring). */
  tickTerrainSecond: () => void;
}

function effectivePlayerStats(player: PlayerCharacter, swampSlowed = false): Stats {
  let s: Stats = { ...player.baseStats };
  for (const eq of Object.values(player.equipment)) {
    if (!eq) continue;
    for (const key of Object.keys(eq.statBonus) as (keyof Stats)[]) {
      s[key] = s[key] + (eq.statBonus[key] ?? 0);
    }
  }
  if (swampSlowed) {
    s.spd = Math.max(1, s.spd - 4);
  }
  return s;
}

function isSwampSlowed(state: Pick<GameState, 'dungeon' | 'terrainResistSeconds'>): boolean {
  return (
    state.dungeon?.theme.id === 'undergroundSwamp' &&
    state.terrainResistSeconds <= 0
  );
}

function pushLog(
  battle: BattleState,
  text: string,
  tone: BattleLogEntry['tone'] = 'info',
) {
  battle.log = [...battle.log, { id: uid(), text, tone }].slice(-40);
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'title',
  player: freshPlayer(),
  playerHp: 42,
  playerMp: 18,
  dungeon: null,
  playerPos: { x: 0, y: 0 },
  facing: 'down',
  battle: null,
  message: null,
  messageTone: 'info',
  keysHeld: null,
  terrainTimerSeconds: null,
  terrainDamaging: false,
  terrainResistSeconds: 0,
  terrainDamageInterval: 0,
  swampMoveCooldownMs: 0,

  startNewGame: (name, gender, heroClass) => {
    const player = freshPlayer(name, gender, heroClass);
    const dungeon = generateDungeonLevel(1);
    const stats = effectivePlayerStats(player);
    const def = stats.def;
    set({
      mode: 'exploring',
      player,
      playerHp: stats.maxHp,
      playerMp: stats.maxMp,
      dungeon,
      playerPos: { ...dungeon.startPos },
      battle: null,
      message: `Floor 1 — ${dungeon.theme.name}`,
      messageTone: 'info',
      terrainTimerSeconds: themeHasHazard(dungeon.theme.id) ? calcTerrainTimer(def) : null,
      terrainDamaging: false,
      terrainResistSeconds: 0,
      terrainDamageInterval: 0,
      swampMoveCooldownMs: 0,
    });
  },

  returnToTitle: () => set({ mode: 'title' }),
  clearMessage: () => set({ message: null }),

  movePlayer: (dx, dy) => {
    const state = get();
    const { dungeon, playerPos, mode } = state;
    if (!dungeon || mode !== 'exploring') return;

    // Swamp slow: enforce a cooldown between moves when no resistance active.
    if (isSwampSlowed(state) && Date.now() < state.swampMoveCooldownMs) return;

    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    const facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
    const tile = dungeon.tiles[ny]?.[nx];
    if (!tile || !tileTypeIsWalkable(tile.type)) {
      set({ facing });
      return;
    }
    tile.discovered = true;

    if (tile.type === 'enemy' && tile.enemyInstanceId) {
      const enemy = dungeon.enemies[tile.enemyInstanceId];
      if (enemy) {
        set({ facing });
        startBattleWith(enemy, tile.enemyInstanceId);
        return;
      }
    }

    if (tile.type === 'trap') {
      const dmg = randInt(4, 10);
      const newHp = Math.max(1, get().playerHp - dmg);
      tile.type = 'triggeredTrap';
      set({
        playerPos: { x: nx, y: ny },
        facing,
        playerHp: newHp,
        message: `A hidden trap triggers! You take ${dmg} damage.`,
        messageTone: 'warning',
      });
      return;
    }

    // ── Proximity battle trigger ────────────────────────────────────────────
    const PROXIMITY = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    for (const [ax, ay] of PROXIMITY) {
      const adjTile = dungeon.tiles[ny + ay!]?.[nx + ax!];
      if (adjTile?.type === 'enemy' && adjTile.enemyInstanceId) {
        const adjEnemy = dungeon.enemies[adjTile.enemyInstanceId];
        if (adjEnemy && !adjEnemy.isBoss) {
          const newCooldown = isSwampSlowed(state) ? Date.now() + 350 : 0;
          set({ playerPos: { x: nx, y: ny }, facing, swampMoveCooldownMs: newCooldown });
          startBattleWith(adjEnemy, adjTile.enemyInstanceId);
          return;
        }
      }
    }

    const newCooldown = isSwampSlowed(state) ? Date.now() + 350 : 0;
    set({ playerPos: { x: nx, y: ny }, facing, swampMoveCooldownMs: newCooldown });
  },

  openChest: () => {
    const { dungeon, playerPos } = get();
    if (!dungeon) return;
    const tile = dungeon.tiles[playerPos.y]?.[playerPos.x];
    const target =
      tile?.type === 'chest'
        ? tile
        : findAdjacentChest(dungeon, playerPos);
    if (!target || target.type !== 'chest') return;

    target.type = 'openedChest';
    const roll = Math.random();
    const player = get().player;
    if (roll < 0.35) {
      const eq = randChoice(LOOT_EQUIPMENT_POOL);
      const instance = cloneEquipmentInstance(eq);
      set({
        player: { ...player, equipmentInventory: [...player.equipmentInventory, instance] },
        message: `You found ${eq.name}! Equip it from your inventory.`,
        messageTone: 'success',
      });
    } else if (roll < 0.7) {
      const item = randChoice(LOOT_ITEM_POOL);
      set({
        player: addItem(player, item, 1),
        message: `You found ${item.name}!`,
        messageTone: 'success',
      });
    } else {
      const gold = randInt(15, 45);
      set({
        player: { ...player, gold: player.gold + gold },
        message: `You found ${gold} gold!`,
        messageTone: 'success',
      });
    }
  },

  interactShop: () => {
    const { dungeon, playerPos } = get();
    if (!dungeon) return;
    const tile = dungeon.tiles[playerPos.y]?.[playerPos.x];
    const target = tile?.type === 'shop' ? tile : findAdjacentShop(dungeon, playerPos);
    if (!target) return;
    set({ message: '__SHOP__', messageTone: 'info' });
  },

  buyFromShop: (itemId) => {
    const item = ITEMS[itemId];
    if (!item) return;
    const player = get().player;
    if (player.gold < item.value) {
      set({ message: 'Not enough gold.', messageTone: 'warning' });
      return;
    }
    set({
      player: addItem({ ...player, gold: player.gold - item.value }, item, 1),
    });
  },

  sellItem: (itemId) => {
    const player = get().player;
    const stack = player.inventory.find((s) => s.item.id === itemId);
    if (!stack || stack.quantity <= 0 || stack.item.type === 'key') return;
    const price = Math.max(1, Math.floor(stack.item.value / 2));
    set({
      player: { ...consumeItem(player, itemId), gold: player.gold + price },
    });
  },

  sellEquipment: (instanceUid) => {
    const player = get().player;
    const eq = player.equipmentInventory.find((e) => e.instanceUid === instanceUid);
    if (!eq) return;
    const price = Math.max(1, Math.floor(eq.value / 2) * (1 + (eq.upgradeLevel ?? 0)));
    set({
      player: {
        ...player,
        equipmentInventory: player.equipmentInventory.filter((e) => e.instanceUid !== instanceUid),
        gold: player.gold + price,
      },
    });
  },

  craftItem: (recipeId) => {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    const player = get().player;
    if (player.gold < recipe.goldCost) {
      set({ message: 'Not enough gold to craft that.', messageTone: 'warning' });
      return;
    }
    for (const mat of recipe.materials) {
      const stack = player.inventory.find((s) => s.item.id === mat.itemId);
      if (!stack || stack.quantity < mat.qty) {
        set({ message: 'Missing materials for that recipe.', messageTone: 'warning' });
        return;
      }
    }
    let nextPlayer = { ...player, gold: player.gold - recipe.goldCost };
    for (const mat of recipe.materials) {
      for (let i = 0; i < mat.qty; i++) {
        nextPlayer = consumeItem(nextPlayer, mat.itemId);
      }
    }
    const resultItem = ITEMS[recipe.resultItemId]!;
    nextPlayer = addItem(nextPlayer, resultItem, recipe.resultQty);
    set({
      player: nextPlayer,
      message: `Crafted ${recipe.resultQty > 1 ? `${recipe.resultQty}x ` : ''}${resultItem.name}!`,
      messageTone: 'success',
    });
  },

  equipItem: (instanceUid) => {
    const player = get().player;
    const gear = player.equipmentInventory.find((e) => e.instanceUid === instanceUid);
    if (!gear) return;
    const currentlyEquipped = player.equipment[gear.slot];
    const nextEquipmentInventory = player.equipmentInventory.filter(
      (e) => e.instanceUid !== instanceUid,
    );
    if (currentlyEquipped) {
      nextEquipmentInventory.push(currentlyEquipped);
    }
    set({
      player: {
        ...player,
        equipment: { ...player.equipment, [gear.slot]: gear },
        equipmentInventory: nextEquipmentInventory,
      },
      message: `Equipped ${equipmentDisplayName(gear)}.`,
      messageTone: 'success',
    });
  },

  unequipItem: (slot) => {
    const player = get().player;
    const current = player.equipment[slot];
    if (!current) return;
    set({
      player: {
        ...player,
        equipment: { ...player.equipment, [slot]: undefined },
        equipmentInventory: [...player.equipmentInventory, current],
      },
      message: `Unequipped ${equipmentDisplayName(current)}.`,
      messageTone: 'info',
    });
  },

  upgradeEquipment: (slot, materialItemId) => {
    const player = get().player;
    const equipped = player.equipment[slot];
    if (!equipped) {
      set({ message: 'Nothing equipped in that slot.', messageTone: 'warning' });
      return;
    }
    const level = equipped.upgradeLevel ?? 0;
    if (level >= 5) {
      set({ message: 'That item is already fully upgraded.', messageTone: 'warning' });
      return;
    }
    const materialQtyNeeded = 2;
    const goldCost = 20 * (level + 1);
    const stack = player.inventory.find((s) => s.item.id === materialItemId);
    if (!stack || stack.quantity < materialQtyNeeded) {
      set({ message: 'Not enough of that material.', messageTone: 'warning' });
      return;
    }
    if (player.gold < goldCost) {
      set({ message: 'Not enough gold for the upgrade.', messageTone: 'warning' });
      return;
    }
    let nextPlayer = { ...player, gold: player.gold - goldCost };
    for (let i = 0; i < materialQtyNeeded; i++) {
      nextPlayer = consumeItem(nextPlayer, materialItemId);
    }
    const upgradedBonus: Partial<Record<keyof Stats, number>> = { ...equipped.statBonus };
    for (const key of Object.keys(upgradedBonus) as (keyof Stats)[]) {
      const base = upgradedBonus[key] ?? 0;
      upgradedBonus[key] = base + Math.max(1, Math.round(base * 0.15));
    }
    const upgraded: Equipment = { ...equipped, statBonus: upgradedBonus, upgradeLevel: level + 1 };
    set({
      player: { ...nextPlayer, equipment: { ...nextPlayer.equipment, [slot]: upgraded } },
      message: `${equipmentDisplayName(equipped)} forged into ${equipmentDisplayName(upgraded)}!`,
      messageTone: 'success',
    });
  },

  allocateStatPoint: (stat) => {
    const player = get().player;
    if (player.statPoints <= 0) return;
    const gain = STAT_POINT_VALUE[stat] || 1;
    const baseStats = { ...player.baseStats, [stat]: player.baseStats[stat] + gain };
    set({
      player: { ...player, baseStats, statPoints: player.statPoints - 1 },
    });
  },

  descendStairs: () => {
    const { dungeon, playerPos, player } = get();
    if (!dungeon) return;
    const tile = dungeon.tiles[playerPos.y]?.[playerPos.x];
    if (!tile || tile.type !== 'stairsDown') return;

    const bossAlive = !!dungeon.bossInstanceId && !!dungeon.enemies[dungeon.bossInstanceId];
    const hasKey = player.inventory.some((s) => s.item.id === 'dungeonKey' && s.quantity > 0);
    if (bossAlive || !hasKey) {
      set({
        message: 'The stairway is sealed — defeat this floor\'s boss for the Dungeon Key!',
        messageTone: 'warning',
      });
      return;
    }

    const nextFloor = dungeon.floor + 1;
    if (nextFloor > 5) {
      set({ player: consumeItem(player, 'dungeonKey'), mode: 'victory' });
      return;
    }
    const nextDungeon = generateDungeonLevel(nextFloor);
    const nextPlayer = consumeItem(player, 'dungeonKey');
    const stats = effectivePlayerStats(nextPlayer);
    set({
      dungeon: nextDungeon,
      player: nextPlayer,
      playerPos: { ...nextDungeon.startPos },
      playerHp: Math.min(get().playerHp + Math.round(stats.maxHp * 0.15), stats.maxHp),
      message: `Floor ${nextFloor} — ${nextDungeon.theme.name}`,
      messageTone: 'info',
      // Reset terrain state for the new floor
      terrainTimerSeconds: themeHasHazard(nextDungeon.theme.id)
        ? calcTerrainTimer(stats.def)
        : null,
      terrainDamaging: false,
      terrainResistSeconds: 0,
      terrainDamageInterval: 0,
      swampMoveCooldownMs: 0,
    });
  },

  battleAction: (action, payload) => {
    const state = get();
    if (state.mode !== 'battle' || !state.battle) return;
    const battle = {
      ...state.battle,
      enemies: state.battle.enemies.map((e) => ({ ...e, stats: { ...e.stats } })),
    };
    const player = state.player;
    const swampSlowed = isSwampSlowed(state);
    const playerStats = computeEffectiveStats(
      effectivePlayerStats(player, swampSlowed),
      battle.playerBuffs,
    );
    playerStats.hp = state.playerHp;
    playerStats.mp = state.playerMp;

    let playerHp = state.playerHp;
    let playerMp = state.playerMp;
    let playerBuffs = { ...battle.playerBuffs };
    let playerDefending = false;
    let fled = false;

    const targetIdx = Math.min(
      payload?.targetIndex ?? battle.targetIndex,
      battle.enemies.length - 1,
    );

    const aliveEnemies = () => battle.enemies.filter((e) => e.stats.hp > 0);

    if (action === 'attack') {
      const target = battle.enemies[targetIdx];
      if (target && target.stats.hp > 0) {
        const dmg = calcPhysicalDamage(
          playerStats.atk,
          target.stats.def,
          1.0,
          playerStats.luck,
        );
        target.stats = { ...target.stats, hp: Math.max(0, target.stats.hp - dmg.amount) };
        pushLog(
          battle,
          `You strike ${target.name} for ${dmg.amount}${dmg.isCrit ? ' (Critical!)' : ''}.`,
          dmg.isCrit ? 'crit' : 'damage',
        );
      }
    } else if (action === 'skill' && payload?.skillId) {
      const skill = SKILLS[payload.skillId];
      if (skill && skill.mpCost <= playerMp) {
        playerMp -= skill.mpCost;

        // ── Shadow Step — guaranteed escape ─────────────────────────────────
        if (skill.guaranteedFlee) {
          fled = true;
          pushLog(battle, `You vanish into the shadows and escape the battle!`, 'system');
        } else if (skill.target === 'self') {
          // ── Percentage heal (e.g. Divine Light) ───────────────────────────
          if (skill.healPercent) {
            const healAmt = Math.round(playerStats.maxHp * skill.healPercent);
            playerHp = Math.min(playerStats.maxHp, playerHp + healAmt);
            pushLog(battle, `You cast ${skill.name} and restore ${healAmt} HP.`, 'heal');
          }
          if (skill.healAmount) {
            playerHp = Math.min(playerStats.maxHp, playerHp + skill.healAmount);
            pushLog(battle, `You cast ${skill.name} and heal ${skill.healAmount} HP.`, 'heal');
          }
          if (skill.statBuff) {
            playerBuffs = { ...playerBuffs };
            for (const key of Object.keys(skill.statBuff) as (keyof Stats)[]) {
              playerBuffs[key] = (playerBuffs[key] ?? 0) + (skill.statBuff[key] ?? 0);
            }
            pushLog(battle, `You cast ${skill.name}, bolstering yourself.`, 'system');
          }
        } else if (skill.target === 'allEnemies') {
          battle.enemies.forEach((enemy) => {
            if (enemy.stats.hp <= 0) return;
            const dmg =
              skill.type === 'magic'
                ? calcMagicDamage(
                    playerStats.matk,
                    enemy.stats.mdef,
                    skill.power,
                    playerStats.luck,
                    skill.element,
                    enemy.weakness,
                    enemy.resist,
                  )
                : calcPhysicalDamage(
                    playerStats.atk,
                    enemy.stats.def,
                    skill.power,
                    playerStats.luck,
                    skill.guaranteedCrit,
                  );
            enemy.stats = { ...enemy.stats, hp: Math.max(0, enemy.stats.hp - dmg.amount) };
            pushLog(
              battle,
              `${skill.name} hits ${enemy.name} for ${dmg.amount}${dmg.isWeak ? ' (weak!)' : dmg.isCrit ? ' (Critical!)' : ''}.`,
              dmg.isWeak || dmg.isCrit ? 'crit' : 'damage',
            );
          });
        } else {
          const target = battle.enemies[targetIdx];
          if (target && target.stats.hp > 0) {
            const dmg =
              skill.type === 'magic'
                ? calcMagicDamage(
                    playerStats.matk,
                    target.stats.mdef,
                    skill.power,
                    playerStats.luck,
                    skill.element,
                    target.weakness,
                    target.resist,
                  )
                : calcPhysicalDamage(
                    playerStats.atk,
                    target.stats.def,
                    skill.power,
                    playerStats.luck,
                    skill.guaranteedCrit,
                  );
            target.stats = { ...target.stats, hp: Math.max(0, target.stats.hp - dmg.amount) };
            pushLog(
              battle,
              `${skill.name} hits ${target.name} for ${dmg.amount}${dmg.isWeak ? ' (weak!)' : dmg.isCrit ? ' (Critical!)' : ''}.`,
              dmg.isWeak || dmg.isCrit ? 'crit' : 'damage',
            );
          }
        }
      }
    } else if (action === 'item' && payload?.itemId) {
      const stack = player.inventory.find((s) => s.item.id === payload.itemId);
      if (stack && stack.quantity > 0) {
        const item = stack.item;
        if (item.healAmount && item.type === 'heal') {
          playerHp = Math.min(playerStats.maxHp, playerHp + item.healAmount);
          pushLog(battle, `You drink ${item.name}, recovering ${item.healAmount} HP.`, 'heal');
        }
        if (item.mpAmount) {
          playerMp = Math.min(playerStats.maxMp, playerMp + item.mpAmount);
          pushLog(battle, `You drink ${item.name}, recovering ${item.mpAmount} MP.`, 'heal');
        }
        if (item.buffStat) {
          playerBuffs = { ...playerBuffs, [item.buffStat]: (playerBuffs[item.buffStat] ?? 0) + item.buffAmount! };
          pushLog(battle, `You use ${item.name}.`, 'system');
        }
        if (item.type === 'attack' && item.damage) {
          const target = battle.enemies[targetIdx];
          if (target && target.stats.hp > 0) {
            const isWeak = target.weakness === item.element;
            const amount = Math.round(item.damage * (isWeak ? 1.5 : 1));
            target.stats = { ...target.stats, hp: Math.max(0, target.stats.hp - amount) };
            pushLog(battle, `${item.name} hits ${target.name} for ${amount}${isWeak ? ' (weak!)' : ''}.`, 'damage');
          }
        }
        set({ player: consumeItem(get().player, item.id) });
      }
    } else if (action === 'defend') {
      playerDefending = true;
      pushLog(battle, 'You brace yourself, reducing incoming damage.', 'system');
    } else if (action === 'flee') {
      const chance = 0.5 + playerStats.spd * 0.01;
      if (Math.random() < chance) {
        fled = true;
        pushLog(battle, 'You flee from battle!', 'system');
      } else {
        pushLog(battle, 'You fail to escape!', 'system');
      }
    }

    if (fled) {
      set({
        mode: 'exploring',
        battle: null,
        playerHp,
        playerMp,
        message: 'You escaped the fight.',
        messageTone: 'warning',
      });
      return;
    }

    // Check victory
    if (aliveEnemies().length === 0) {
      const totalXp = battle.enemies.reduce((sum, e) => sum + e.xpReward, 0);
      const totalGold = battle.enemies.reduce((sum, e) => sum + e.goldReward, 0);
      const preLevel = get().player.level;
      let leveledPlayer = grantXp(get().player, totalXp);
      leveledPlayer = { ...leveledPlayer, gold: leveledPlayer.gold + totalGold };
      const leveledUp = leveledPlayer.level > preLevel;

      const dropNames: string[] = [];
      for (const enemy of battle.enemies) {
        for (const drop of enemy.lootTable ?? []) {
          if (Math.random() > drop.chance) continue;
          const qty = randInt(drop.min ?? 1, drop.max ?? drop.min ?? 1);
          if (drop.itemId) {
            const item = ITEMS[drop.itemId];
            if (item) {
              leveledPlayer = addItem(leveledPlayer, item, qty);
              dropNames.push(qty > 1 ? `${qty}x ${item.name}` : item.name);
            }
          } else if (drop.equipmentId) {
            const eqTemplate = LOOT_EQUIPMENT_POOL.find((e) => e.id === drop.equipmentId);
            if (eqTemplate) {
              const instance = cloneEquipmentInstance(eqTemplate);
              leveledPlayer = {
                ...leveledPlayer,
                equipmentInventory: [...leveledPlayer.equipmentInventory, instance],
              };
              dropNames.push(eqTemplate.name);
            }
          }
        }
        if (enemy.isBoss) {
          leveledPlayer = addItem(leveledPlayer, ITEMS.dungeonKey!, 1);
          dropNames.push('Dungeon Key');
        }
      }

      const dungeon = get().dungeon;
      if (dungeon && battle.originTileEnemyId) {
        delete dungeon.enemies[battle.originTileEnemyId];
        for (const row of dungeon.tiles) {
          for (const t of row) {
            if (t.enemyInstanceId === battle.originTileEnemyId) {
              t.type = 'floor';
              t.enemyInstanceId = undefined;
            }
          }
        }
        checkAndUnlockBossDoor(dungeon);
      }
      const dropText = dropNames.length ? ` Found: ${dropNames.join(', ')}.` : '';
      const newStats = effectivePlayerStats(leveledPlayer);
      const finalHp = leveledUp ? newStats.maxHp : Math.min(playerHp, newStats.maxHp) || playerHp;
      const finalMp = leveledUp ? newStats.maxMp : Math.min(playerMp, newStats.maxMp) || playerMp;
      const levelUpText = leveledUp ? ' Level up! HP and MP fully restored.' : '';
      set({
        mode: 'exploring',
        battle: null,
        playerHp: finalHp,
        playerMp: finalMp,
        player: leveledPlayer,
        dungeon: dungeon ? { ...dungeon } : dungeon,
        message: `Victory! +${totalXp} XP, +${totalGold} gold.${dropText}${levelUpText}`,
        messageTone: 'success',
      });
      return;
    }

    // ── Enemy turn(s) ───────────────────────────────────────────────────────
    let hp = playerHp;
    for (const enemy of battle.enemies) {
      if (enemy.stats.hp <= 0) continue;
      const enemyAction = pickEnemyAction(enemy);

      if (enemyAction.type === 'defend') {
        pushLog(battle, `${enemy.name} braces for the next attack.`, 'system');
        continue;
      }

      if (enemyAction.type === 'skill') {
        const skill = SKILLS[enemyAction.skillId];
        if (skill) {
          const defStat = playerDefending ? playerStats.def * 2 : playerStats.def;
          const mdefStat = playerDefending ? playerStats.mdef * 1.5 : playerStats.mdef;
          const dmg =
            skill.type === 'magic'
              ? calcMagicDamage(enemy.stats.matk, mdefStat, skill.power, enemy.stats.luck, skill.element)
              : calcPhysicalDamage(enemy.stats.atk, defStat, skill.power, enemy.stats.luck);
          hp = Math.max(0, hp - dmg.amount);
          pushLog(
            battle,
            `${enemy.name} uses ${skill.name} for ${dmg.amount}${dmg.isCrit ? ' (Critical!)' : ''}!`,
            'damage',
          );
          if (hp <= 0) break;
          continue;
        }
      }

      // Regular attack
      const dmg = calcPhysicalDamage(
        enemy.stats.atk,
        playerDefending ? playerStats.def * 2 : playerStats.def,
        1,
        enemy.stats.luck,
      );
      hp = Math.max(0, hp - dmg.amount);
      pushLog(
        battle,
        `${enemy.name} attacks you for ${dmg.amount}${dmg.isCrit ? ' (Critical!)' : ''}.`,
        'damage',
      );
      if (hp <= 0) break;
    }

    if (hp <= 0) {
      const currentPlayer = get().player;
      const reviveStack = currentPlayer.inventory.find(
        (s) => s.item.id === 'reviveScroll' && s.quantity > 0,
      );
      if (reviveStack) {
        set({
          player: consumeItem(currentPlayer, 'reviveScroll'),
          playerHp: reviveStack.item.healAmount ?? 30,
          playerMp,
          battle: { ...battle, playerBuffs, playerDefending },
          message: 'A Revive Scroll saves you from defeat!',
          messageTone: 'success',
        });
        return;
      }
      set({ mode: 'gameover', battle: null, playerHp: 0 });
      return;
    }

    set({
      playerHp: hp,
      playerMp,
      battle: { ...battle, playerBuffs, playerDefending, targetIndex: targetIdx },
    });
  },

  tickMobWander: () => {
    const { dungeon, mode } = get();
    if (!dungeon || mode !== 'exploring') return;

    const enemyTilePos: Record<string, { x: number; y: number }> = {};
    for (const row of dungeon.tiles) {
      for (const t of row) {
        if (t.enemyInstanceId) enemyTilePos[t.enemyInstanceId] = { x: t.x, y: t.y };
      }
    }

    let changed = false;
    const DIRS = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    const BLOCKED: Set<string> = new Set(['wall', 'lockedDoor', 'enemy', 'chest', 'shop', 'stairsDown', 'start']);

    for (const [id, enemy] of Object.entries(dungeon.enemies)) {
      if (enemy.isBoss) continue;
      const pos = enemyTilePos[id];
      if (!pos) continue;
      const options: { x: number; y: number }[] = [];
      for (const { dx, dy } of DIRS) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        const t = dungeon.tiles[ny]?.[nx];
        if (!t || BLOCKED.has(t.type)) continue;
        options.push({ x: nx, y: ny });
      }
      if (options.length === 0) continue;
      const to = options[Math.floor(Math.random() * options.length)]!;
      dungeon.tiles[pos.y]![pos.x]!.type = 'floor';
      dungeon.tiles[pos.y]![pos.x]!.enemyInstanceId = undefined;
      dungeon.tiles[to.y]![to.x]!.type = 'enemy';
      dungeon.tiles[to.y]![to.x]!.enemyInstanceId = id;
      changed = true;
    }
    if (changed) set({ dungeon: { ...dungeon } });
  },

  mergeEquipment: (uid1, uid2) => {
    const player = get().player;
    const eq1 = player.equipmentInventory.find((e) => e.instanceUid === uid1);
    const eq2 = player.equipmentInventory.find((e) => e.instanceUid === uid2);
    if (!eq1 || !eq2) return;
    if (eq1.id !== eq2.id || (eq1.upgradeLevel ?? 0) !== (eq2.upgradeLevel ?? 0)) return;

    const newLevel = (eq1.upgradeLevel ?? 0) + 1;
    const mergedBonus: Partial<Record<keyof Stats, number>> = {};
    const allKeys = new Set([
      ...(Object.keys(eq1.statBonus) as (keyof Stats)[]),
      ...(Object.keys(eq2.statBonus) as (keyof Stats)[]),
    ]);
    for (const key of allKeys) {
      const v1 = eq1.statBonus[key] ?? 0;
      const v2 = eq2.statBonus[key] ?? 0;
      mergedBonus[key] = Math.round(Math.max(v1, v2) * 1.15 + 1);
    }
    const merged: Equipment = { ...eq1, instanceUid: uid(), upgradeLevel: newLevel, statBonus: mergedBonus };
    set({
      player: {
        ...player,
        equipmentInventory: [
          ...player.equipmentInventory.filter((e) => e.instanceUid !== uid1 && e.instanceUid !== uid2),
          merged,
        ],
      },
      message: `Merged into ${equipmentDisplayName(merged)}!`,
      messageTone: 'success',
    });
  },

  useItem: (itemId) => {
    const state = get();
    if (state.mode !== 'exploring') return;
    const stack = state.player.inventory.find((s) => s.item.id === itemId);
    if (!stack || stack.quantity <= 0) return;
    const item = stack.item;

    // ── Boss core consumption ──────────────────────────────────────────────
    if (item.type === 'bossCore') {
      const player = state.player;
      let nextPlayer = consumeItem(player, item.id);

      if (item.grantSkillId && !player.skillIds.includes(item.grantSkillId)) {
        // Grant the new skill
        nextPlayer = { ...nextPlayer, skillIds: [...nextPlayer.skillIds, item.grantSkillId] };
        const skill = SKILLS[item.grantSkillId];
        set({
          player: nextPlayer,
          message: `You absorb the core and learn ${skill?.name ?? item.grantSkillId}!`,
          messageTone: 'success',
        });
      } else if (item.fallbackStatBonus) {
        // Skill already known — grant stat bonus instead
        const gains = item.fallbackStatBonus;
        const baseStats = { ...nextPlayer.baseStats };
        for (const key of Object.keys(gains) as (keyof Stats)[]) {
          baseStats[key] = (baseStats[key] ?? 0) + (gains[key] ?? 0);
        }
        nextPlayer = { ...nextPlayer, baseStats };
        const bonusText = Object.entries(gains)
          .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
          .join(', ');
        set({
          player: nextPlayer,
          message: `Skill already known — you gain ${bonusText} instead!`,
          messageTone: 'success',
        });
      }
      return;
    }

    // ── Terrain resistance items ───────────────────────────────────────────
    if (item.terrainResist) {
      const seconds = item.resistSeconds ?? 60;
      const newResist = state.terrainResistSeconds + seconds;
      set({
        player: consumeItem(state.player, item.id),
        terrainResistSeconds: newResist,
        message: `${item.name} active — terrain hazard resisted for ${seconds}s!`,
        messageTone: 'success',
      });
      return;
    }

    if (item.type !== 'heal' && !item.mpAmount && !item.buffStat) {
      set({ message: `${item.name} can only be used in battle.`, messageTone: 'info' });
      return;
    }

    const playerStats = effectivePlayerStats(state.player);
    let playerHp = state.playerHp;
    let playerMp = state.playerMp;
    const logs: string[] = [];

    if (item.healAmount && item.type === 'heal') {
      playerHp = Math.min(playerStats.maxHp, playerHp + item.healAmount);
      logs.push(`recovering ${item.healAmount} HP`);
    }
    if (item.mpAmount) {
      playerMp = Math.min(playerStats.maxMp, playerMp + item.mpAmount);
      logs.push(`recovering ${item.mpAmount} MP`);
    }
    if (item.buffStat) {
      logs.push('feeling the effects take hold');
    }

    set({
      player: consumeItem(state.player, item.id),
      playerHp,
      playerMp,
      message: `You use ${item.name}${logs.length ? `, ${logs.join(' and ')}.` : '.'}`,
      messageTone: 'success',
    });
  },

  tickTerrainSecond: () => {
    const state = get();
    if (state.mode !== 'exploring' || !state.dungeon) return;

    // Tick down resistance timer first.
    const newResist = Math.max(0, state.terrainResistSeconds - 1);

    // While resisted, don't advance the hazard.
    if (state.terrainResistSeconds > 0) {
      set({ terrainResistSeconds: newResist });
      return;
    }

    // Hot / cold terrain timer countdown.
    if (state.terrainTimerSeconds !== null && state.terrainTimerSeconds > 0) {
      set({ terrainTimerSeconds: state.terrainTimerSeconds - 1, terrainResistSeconds: newResist });
      return;
    }

    // Timer expired → damage phase. Tick every 10 s.
    if (state.terrainTimerSeconds === 0 || state.terrainDamaging) {
      const nextInterval = state.terrainDamageInterval + 1;
      if (nextInterval >= 10) {
        const dmg = randInt(4, 10);
        const newHp = Math.max(1, get().playerHp - dmg);
        const themeId = state.dungeon.theme.id;
        const src = themeId === 'lavaCavern' ? '🔥 Scorching heat' : '❄️ Bitter cold';
        set({
          playerHp: newHp,
          terrainDamaging: true,
          terrainTimerSeconds: 0,
          terrainDamageInterval: 0,
          terrainResistSeconds: newResist,
          message: `${src} deals ${dmg} damage!`,
          messageTone: 'warning',
        });
      } else {
        set({
          terrainDamaging: true,
          terrainTimerSeconds: 0,
          terrainDamageInterval: nextInterval,
          terrainResistSeconds: newResist,
        });
      }
    }
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkAndUnlockBossDoor(dungeon: DungeonLevel): void {
  const nonBossAlive = Object.values(dungeon.enemies).some((e) => !e.isBoss);
  if (nonBossAlive || !dungeon.bossDoorPos) return;
  const { x, y } = dungeon.bossDoorPos;
  const tile = dungeon.tiles[y]?.[x];
  if (tile && tile.type === 'lockedDoor') tile.type = 'floor';
}

function findAdjacentChest(dungeon: DungeonLevel, pos: { x: number; y: number }) {
  const offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of offsets) {
    const t = dungeon.tiles[pos.y + dy!]?.[pos.x + dx!];
    if (t && t.type === 'chest') return t;
  }
  return undefined;
}

function findAdjacentShop(dungeon: DungeonLevel, pos: { x: number; y: number }) {
  const offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of offsets) {
    const t = dungeon.tiles[pos.y + dy!]?.[pos.x + dx!];
    if (t && t.type === 'shop') return t;
  }
  return undefined;
}

function addItem(player: PlayerCharacter, item: Item, qty: number): PlayerCharacter {
  const inventory = [...player.inventory];
  const idx = inventory.findIndex((s) => s.item.id === item.id);
  if (idx >= 0) {
    inventory[idx] = { ...inventory[idx]!, quantity: inventory[idx]!.quantity + qty };
  } else {
    inventory.push({ item, quantity: qty });
  }
  return { ...player, inventory };
}

function consumeItem(player: PlayerCharacter, itemId: string): PlayerCharacter {
  let consumed = false;
  const inventory = player.inventory
    .map((s) => {
      if (!consumed && s.item.id === itemId) {
        consumed = true;
        return { ...s, quantity: s.quantity - 1 };
      }
      return s;
    })
    .filter((s) => s.quantity > 0);
  return { ...player, inventory };
}

function cloneEquipmentInstance(eq: Equipment): Equipment {
  return { ...eq, instanceUid: uid(), upgradeLevel: 0 };
}

export function equipmentDisplayName(eq: Equipment): string {
  const level = eq.upgradeLevel ?? 0;
  return level > 0 ? `${eq.name} +${level}` : eq.name;
}

function grantXp(player: PlayerCharacter, xp: number): PlayerCharacter {
  let level = player.level;
  let curXp = player.xp + xp;
  let xpToNext = player.xpToNext;
  let baseStats = { ...player.baseStats };
  let skillIds = [...player.skillIds];
  let statPoints = player.statPoints;

  while (curXp >= xpToNext) {
    curXp -= xpToNext;
    level += 1;
    xpToNext = xpToNextLevel(level);
    const gains = autoStatGainsForLevelUp(player.heroClass);
    for (const key of Object.keys(gains) as (keyof Stats)[]) {
      baseStats[key] = baseStats[key] + (gains[key] ?? 0);
    }
    statPoints += STAT_POINTS_PER_LEVEL;
    baseStats.hp = baseStats.maxHp;
    baseStats.mp = baseStats.maxMp;
    const newSkills = SKILL_UNLOCK_ORDER.filter(
      (s) => s.unlockLevel === level && !skillIds.includes(s.id),
    );
    skillIds = [...skillIds, ...newSkills.map((s) => s.id)];
  }

  return { ...player, level, xp: curXp, xpToNext, baseStats, skillIds, statPoints };
}

export function startBattleWith(enemyRoot: EnemyInstance, tileEnemyId: string) {
  const state = useGameStore.getState();
  const dungeon = state.dungeon;
  if (!dungeon) return;

  const groupSize = enemyRoot.isBoss ? 1 : randInt(1, 2);
  const enemies: EnemyInstance[] = [enemyRoot];
  if (!enemyRoot.isBoss && groupSize > 1) {
    const extra: EnemyInstance = {
      ...enemyRoot,
      instanceId: `${enemyRoot.id}-${Math.random().toString(36).slice(2, 9)}`,
      stats: { ...enemyRoot.stats },
    };
    enemies.push(extra);
  }

  // Apply swamp SPD debuff as an initial player buff when fighting in swamp terrain.
  const swampSlowed =
    dungeon.theme.id === 'undergroundSwamp' && state.terrainResistSeconds <= 0;
  const startingBuffs: Partial<Record<keyof import('./types').Stats, number>> = swampSlowed
    ? { spd: -4 }
    : {};

  const battle: BattleState = {
    enemies,
    playerBuffs: startingBuffs,
    turn: 'player',
    log: [
      {
        id: uid(),
        text: `${enemyRoot.isBoss ? 'A powerful foe' : 'An enemy'} blocks your path!${swampSlowed ? ' (Swamp slows your reactions.)' : ''}`,
        tone: 'info',
      },
    ],
    targetIndex: 0,
    playerDefending: false,
    fleeAttempted: false,
    victory: false,
    originTileEnemyId: tileEnemyId,
  };
  useGameStore.setState({ mode: 'battle', battle });
}

export function getPlayerEffectiveStats(player: PlayerCharacter): import('./types').Stats {
  return effectivePlayerStats(player);
}

export function getAvailableSkills(player: PlayerCharacter): Skill[] {
  return player.skillIds.map((id) => SKILLS[id]!).filter(Boolean);
}
