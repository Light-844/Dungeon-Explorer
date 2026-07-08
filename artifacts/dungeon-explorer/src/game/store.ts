import { create } from 'zustand';
import {
  BASE_PLAYER_STATS,
  EQUIPMENT,
  ITEMS,
  LOOT_EQUIPMENT_POOL,
  LOOT_ITEM_POOL,
  SKILL_UNLOCK_ORDER,
  SKILLS,
  STARTING_EQUIPMENT,
} from './gameData';
import { generateDungeonLevel, tileTypeIsWalkable } from './dungeonGenerator';
import {
  calcMagicDamage,
  calcPhysicalDamage,
  computeEffectiveStats,
  pickEnemyAction,
  statGainsForLevelUp,
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

function freshPlayer(): PlayerCharacter {
  return {
    name: 'Adventurer',
    level: 1,
    xp: 0,
    xpToNext: xpToNextLevel(1),
    gold: 30,
    baseStats: { ...BASE_PLAYER_STATS },
    equipment: { ...STARTING_EQUIPMENT } as PlayerCharacter['equipment'],
    skillIds: SKILL_UNLOCK_ORDER.filter((s) => s.unlockLevel === 1).map(
      (s) => s.id,
    ),
    inventory: [
      { item: ITEMS.smallPotion!, quantity: 3 },
      { item: ITEMS.dungeonKey!, quantity: 1 },
    ],
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

  startNewGame: () => void;
  movePlayer: (dx: number, dy: number) => void;
  openChest: () => void;
  interactShop: () => void;
  buyFromShop: (itemId: string) => void;
  descendStairs: () => void;
  battleAction: (
    action: 'attack' | 'skill' | 'item' | 'defend' | 'flee',
    payload?: { skillId?: string; itemId?: string; targetIndex?: number },
  ) => void;
  useItem: (itemId: string) => void;
  clearMessage: () => void;
  returnToTitle: () => void;
}

function effectivePlayerStats(player: PlayerCharacter): Stats {
  let s: Stats = { ...player.baseStats };
  for (const eq of Object.values(player.equipment)) {
    if (!eq) continue;
    for (const key of Object.keys(eq.statBonus) as (keyof Stats)[]) {
      s[key] = s[key] + (eq.statBonus[key] ?? 0);
    }
  }
  return s;
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
  playerHp: BASE_PLAYER_STATS.hp,
  playerMp: BASE_PLAYER_STATS.mp,
  dungeon: null,
  playerPos: { x: 0, y: 0 },
  facing: 'down',
  battle: null,
  message: null,
  messageTone: 'info',
  keysHeld: null,

  startNewGame: () => {
    const player = freshPlayer();
    const dungeon = generateDungeonLevel(1);
    const stats = effectivePlayerStats(player);
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
    });
  },

  returnToTitle: () => set({ mode: 'title' }),

  clearMessage: () => set({ message: null }),

  movePlayer: (dx, dy) => {
    const { dungeon, playerPos, mode } = get();
    if (!dungeon || mode !== 'exploring') return;
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
      const stats = effectivePlayerStats(get().player);
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
      void stats;
      return;
    }

    set({ playerPos: { x: nx, y: ny }, facing });
  },

  openChest: () => {
    const { dungeon, playerPos } = get();
    if (!dungeon) return;
    const tile = dungeon.tiles[playerPos.y]?.[playerPos.x];
    // Also check adjacent-facing tile since chests sit on their own cell
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
      const updated = equipIfBetter(player, eq);
      set({
        player: updated.player,
        message: updated.equipped
          ? `You found ${eq.name} and equipped it!`
          : `You found ${eq.name} (kept your current gear — sold for ${eq.value}g).`,
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

  descendStairs: () => {
    const { dungeon, playerPos, player } = get();
    if (!dungeon) return;
    const tile = dungeon.tiles[playerPos.y]?.[playerPos.x];
    if (!tile || tile.type !== 'stairsDown') return;
    const nextFloor = dungeon.floor + 1;
    if (nextFloor > 5) {
      const bossAlive = Object.values(dungeon.enemies).some((e) => e.isBoss);
      if (bossAlive) {
        set({
          message: 'The way is sealed — defeat the floor boss first!',
          messageTone: 'warning',
        });
        return;
      }
      set({ mode: 'victory' });
      return;
    }
    const nextDungeon = generateDungeonLevel(nextFloor);
    const stats = effectivePlayerStats(player);
    set({
      dungeon: nextDungeon,
      playerPos: { ...nextDungeon.startPos },
      playerHp: Math.min(get().playerHp + Math.round(stats.maxHp * 0.15), stats.maxHp),
      message: `Floor ${nextFloor} — ${nextDungeon.theme.name}`,
      messageTone: 'info',
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
    const playerStats = computeEffectiveStats(
      effectivePlayerStats(player),
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
        if (skill.target === 'self') {
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
                : calcPhysicalDamage(playerStats.atk, enemy.stats.def, skill.power, playerStats.luck);
            enemy.stats = { ...enemy.stats, hp: Math.max(0, enemy.stats.hp - dmg.amount) };
            pushLog(
              battle,
              `${skill.name} hits ${enemy.name} for ${dmg.amount}${dmg.isWeak ? ' (weak!)' : ''}.`,
              'damage',
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
                : calcPhysicalDamage(playerStats.atk, target.stats.def, skill.power, playerStats.luck);
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
        set({
          player: consumeItem(get().player, item.id),
        });
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
      const leveledPlayer = grantXp(get().player, totalXp);
      // Remove enemy from the dungeon map
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
      }
      set({
        mode: 'exploring',
        battle: null,
        playerHp: Math.min(playerHp, effectivePlayerStats(leveledPlayer).maxHp) || playerHp,
        playerMp,
        player: { ...leveledPlayer, gold: leveledPlayer.gold + totalGold },
        dungeon: dungeon ? { ...dungeon } : dungeon,
        message: `Victory! +${totalXp} XP, +${totalGold} gold.`,
        messageTone: 'success',
      });
      return;
    }

    // Enemy turn(s)
    let hp = playerHp;
    for (const enemy of battle.enemies) {
      if (enemy.stats.hp <= 0) continue;
      const enemyAction = pickEnemyAction(enemy);
      if (enemyAction === 'defend') {
        pushLog(battle, `${enemy.name} braces for the next attack.`, 'system');
        continue;
      }
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
      const player = get().player;
      const reviveStack = player.inventory.find((s) => s.item.id === 'reviveScroll' && s.quantity > 0);
      if (reviveStack) {
        set({
          player: consumeItem(player, 'reviveScroll'),
          playerHp: reviveStack.item.healAmount ?? 30,
          playerMp,
          battle: { ...battle, playerBuffs, playerDefending },
          message: 'A Revive Scroll saves you from defeat!',
          messageTone: 'success',
        });
        return;
      }
      set({
        mode: 'gameover',
        battle: null,
        playerHp: 0,
      });
      return;
    }

    set({
      playerHp: hp,
      playerMp,
      battle: { ...battle, playerBuffs, playerDefending, targetIndex: targetIdx },
    });
  },

  useItem: (itemId) => {
    const state = get();
    if (state.mode !== 'exploring') return;
    const stack = state.player.inventory.find((s) => s.item.id === itemId);
    if (!stack || stack.quantity <= 0) return;
    const item = stack.item;
    if (item.type !== 'heal' && !item.mpAmount && !item.buffStat) {
      set({
        message: `${item.name} can only be used in battle.`,
        messageTone: 'info',
      });
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
}));

// ---------------------------------------------------------------------------
// Helpers that mutate/derive game state outside the store definition
// ---------------------------------------------------------------------------

function findAdjacentChest(dungeon: DungeonLevel, pos: { x: number; y: number }) {
  const offsets = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of offsets) {
    const t = dungeon.tiles[pos.y + dy!]?.[pos.x + dx!];
    if (t && t.type === 'chest') return t;
  }
  return undefined;
}

function findAdjacentShop(dungeon: DungeonLevel, pos: { x: number; y: number }) {
  const offsets = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
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
  const inventory = player.inventory
    .map((s) => (s.item.id === itemId ? { ...s, quantity: s.quantity - 1 } : s))
    .filter((s) => s.quantity > 0);
  return { ...player, inventory };
}

function equipIfBetter(
  player: PlayerCharacter,
  eq: Equipment,
): { player: PlayerCharacter; equipped: boolean } {
  const current = player.equipment[eq.slot];
  const score = (e?: Equipment) =>
    e ? Object.values(e.statBonus).reduce((a, b) => a + (b ?? 0), 0) : -Infinity;
  if (score(eq) > score(current)) {
    return {
      player: { ...player, equipment: { ...player.equipment, [eq.slot]: eq } },
      equipped: true,
    };
  }
  return {
    player: { ...player, gold: player.gold + eq.value },
    equipped: false,
  };
}

function grantXp(player: PlayerCharacter, xp: number): PlayerCharacter {
  let level = player.level;
  let curXp = player.xp + xp;
  let xpToNext = player.xpToNext;
  let baseStats = { ...player.baseStats };
  let skillIds = [...player.skillIds];

  while (curXp >= xpToNext) {
    curXp -= xpToNext;
    level += 1;
    xpToNext = xpToNextLevel(level);
    const gains = statGainsForLevelUp();
    for (const key of Object.keys(gains) as (keyof Stats)[]) {
      baseStats[key] = baseStats[key] + (gains[key] ?? 0);
    }
    baseStats.hp = baseStats.maxHp;
    baseStats.mp = baseStats.maxMp;
    const newSkills = SKILL_UNLOCK_ORDER.filter(
      (s) => s.unlockLevel === level && !skillIds.includes(s.id),
    );
    skillIds = [...skillIds, ...newSkills.map((s) => s.id)];
  }

  return { ...player, level, xp: curXp, xpToNext, baseStats, skillIds };
}

export function startBattleWith(enemyRoot: EnemyInstance, tileEnemyId: string) {
  const state = useGameStore.getState();
  const dungeon = state.dungeon;
  if (!dungeon) return;
  const groupSize = enemyRoot.isBoss ? 1 : randInt(1, 2);
  const enemies: EnemyInstance[] = [enemyRoot];
  if (!enemyRoot.isBoss && groupSize > 1) {
    // Pull one more enemy of the same theme, freshly generated (visual-only add-on)
    const extra: EnemyInstance = {
      ...enemyRoot,
      instanceId: `${enemyRoot.id}-${Math.random().toString(36).slice(2, 9)}`,
      stats: { ...enemyRoot.stats },
    };
    enemies.push(extra);
  }
  const battle: BattleState = {
    enemies,
    playerBuffs: {},
    turn: 'player',
    log: [{ id: uid(), text: `${enemyRoot.isBoss ? 'A powerful foe' : 'An enemy'} blocks your path!`, tone: 'info' }],
    targetIndex: 0,
    playerDefending: false,
    fleeAttempted: false,
    victory: false,
    originTileEnemyId: tileEnemyId,
  };
  useGameStore.setState({ mode: 'battle', battle });
}

export function getPlayerEffectiveStats(player: PlayerCharacter): Stats {
  return effectivePlayerStats(player);
}

export function getAvailableSkills(player: PlayerCharacter): Skill[] {
  return player.skillIds.map((id) => SKILLS[id]!).filter(Boolean);
}
