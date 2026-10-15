import type { EnemyInstance, Skill, Stats } from "./types";

export function computeEffectiveStats(
  base: Stats,
  buffs: Partial<Record<keyof Stats, number>>,
): Stats {
  const result = { ...base };
  for (const key of Object.keys(buffs) as (keyof Stats)[]) {
    result[key] = Math.max(0, result[key] + (buffs[key] ?? 0));
  }
  return result;
}

export function rollCrit(luck: number, forced = false): boolean {
  if (forced) return true;
  const chance = 0.05 + Math.min(0.25, luck * 0.01);
  return Math.random() < chance;
}

export interface DamageResult {
  amount: number;
  isCrit: boolean;
  isWeak: boolean;
  isResist: boolean;
}

export function calcPhysicalDamage(
  attackerAtk: number,
  defenderDef: number,
  power: number,
  luck: number,
  forceCrit = false,
): DamageResult {
  const isCrit = rollCrit(luck, forceCrit);
  const raw = Math.max(1, attackerAtk * power - defenderDef * 0.6);
  const variance = 0.9 + Math.random() * 0.2;
  const amount = Math.round(raw * variance * (isCrit ? 1.8 : 1));
  return {
    amount: Math.max(1, amount),
    isCrit,
    isWeak: false,
    isResist: false,
  };
}

export function calcMagicDamage(
  attackerMatk: number,
  defenderMdef: number,
  power: number,
  luck: number,
  element: string,
  weakness?: string,
  resist?: string,
): DamageResult {
  const isCrit = rollCrit(luck);
  const isWeak = !!weakness && weakness === element;
  const isResist = !!resist && resist === element;
  let raw = Math.max(1, attackerMatk * power - defenderMdef * 0.5);
  if (isWeak) raw *= 1.6;
  if (isResist) raw *= 0.5;
  const variance = 0.9 + Math.random() * 0.2;
  const amount = Math.round(raw * variance * (isCrit ? 1.8 : 1));
  return { amount: Math.max(1, amount), isCrit, isWeak, isResist };
}

export type EnemyAction =
  | { type: 'attack' }
  | { type: 'defend' }
  | { type: 'skill'; skillId: string };

export function pickEnemyAction(enemy: EnemyInstance): EnemyAction {
  const hpRatio = enemy.stats.hp / enemy.stats.maxHp;

  // Defend when low HP
  if (hpRatio < 0.25 && Math.random() < 0.35) return { type: 'defend' };

  // Use a skill if available (higher chance for bosses)
  if (enemy.skillIds.length > 0) {
    const skillChance = enemy.isBoss ? 0.6 : 0.35;
    if (Math.random() < skillChance) {
      const skillId = enemy.skillIds[Math.floor(Math.random() * enemy.skillIds.length)]!;
      return { type: 'skill', skillId };
    }
  }

  return { type: 'attack' };
}

export function xpToNextLevel(level: number): number {
  return Math.round(28 * Math.pow(level, 1.45));
}

/**
 * Automatic stat growth on level-up (on top of free stat-points).
 * Each class grows at a different rate; defaults to generic growth when
 * no class is supplied (e.g. legacy saves).
 */
export function autoStatGainsForLevelUp(heroClass?: string): Partial<Stats> {
  const table: Record<string, { maxHp: number; maxMp: number }> = {
    warrior: { maxHp: 7, maxMp: 1 },
    mage:    { maxHp: 3, maxMp: 5 },
    rogue:   { maxHp: 5, maxMp: 2 },
    paladin: { maxHp: 6, maxMp: 3 },
    allrounder: { maxHp: 5, maxMp: 3 },
  };
  return (heroClass ? table[heroClass] : undefined) ?? { maxHp: 5, maxMp: 2 };
}

/** Points granted to the player on every level-up, freely assignable to any stat. */
export const STAT_POINTS_PER_LEVEL = 5;

/** How much a single allocated point raises each stat by. */
export const STAT_POINT_VALUE: Record<keyof Stats, number> = {
  hp: 1,
  maxHp: 6,
  mp: 1,
  maxMp: 3,
  atk: 2,
  def: 2,
  matk: 2,
  mdef: 2,
  spd: 1,
  luck: 1,
};

export function skillFitsTurn(skill: Skill, currentMp: number): boolean {
  return skill.mpCost <= currentMp;
}
