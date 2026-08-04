import type { ClassAttributes, Stats } from './types';

export interface ClassDef {
  id: string;
  name: string;
  role: string;
  description: string;
  /** Full base Stats for this class at level 1. */
  baseStats: Stats;
  attributes: ClassAttributes;
  /** Equipment IDs for starter weapon and armor. */
  starterWeaponId: string;
  starterArmorId: string;
  /** Skill IDs the class begins with (not gated by level). */
  startingSkillIds: string[];
  /** Automatic stat gains every level-up (on top of free stat points). */
  levelUpGains: { maxHp: number; maxMp: number };
  /** Hex colour used for the class card glow/badge. */
  colorPrimary: string;
  colorGlow: string;
  /** Short display summaries of class abilities for the selection screen. */
  abilities: { name: string; cost: string; desc: string }[];
}

export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    role: 'Master of Melee Combat & Heavy Defense',
    description:
      'Tough, relentless, and built to absorb punishment. Warriors wade into the thick of battle and hit back twice as hard.',
    baseStats: {
      hp: 120, maxHp: 120,
      mp: 30,  maxMp: 30,
      atk: 14, def: 9,
      matk: 5, mdef: 6,
      spd: 7,  luck: 5,
    },
    attributes: { str: 14, dex: 10, int: 8, con: 14 },
    starterWeaponId: 'ironLongsword',
    starterArmorId: 'paddedVest',
    startingSkillIds: ['whirlwindStrike', 'shieldBash'],
    levelUpGains: { maxHp: 7, maxMp: 1 },
    colorPrimary: '#6ba3c8',
    colorGlow: '#6ba3c855',
    abilities: [
      {
        name: 'Whirlwind Strike',
        cost: '10 MP',
        desc: 'Slice through all enemies at once — 140 % physical damage to each.',
      },
      {
        name: 'Shield Bash',
        cost: '15 MP',
        desc: 'Slam the target with your shield for 120 % physical damage.',
      },
    ],
  },

  mage: {
    id: 'mage',
    name: 'Arcane Mage',
    role: 'Wielder of Elemental Fire & Ice Magic',
    description:
      'Fragile but ferociously powerful. Mages channel raw elemental energy to obliterate enemies — but one wrong hit can end them.',
    baseStats: {
      hp: 75,  maxHp: 75,
      mp: 100, maxMp: 100,
      atk: 6,  def: 4,
      matk: 16, mdef: 9,
      spd: 9,  luck: 6,
    },
    attributes: { str: 8, dex: 10, int: 16, con: 10 },
    starterWeaponId: 'apprenticeWand',
    starterArmorId: 'silkRobes',
    startingSkillIds: ['fireball', 'frostNova'],
    levelUpGains: { maxHp: 3, maxMp: 5 },
    colorPrimary: '#9b6bdf',
    colorGlow: '#9b6bdf55',
    abilities: [
      {
        name: 'Fireball',
        cost: '6 MP',
        desc: 'Hurl a searing fireball — 150 % spell damage, great vs ice enemies.',
      },
      {
        name: 'Frost Nova',
        cost: '25 MP',
        desc: 'Erupt in an icy shockwave — 150 % area ice damage to all enemies.',
      },
    ],
  },

  rogue: {
    id: 'rogue',
    name: 'Shadow Rogue',
    role: 'Lethal Agility, Critical Precision & Mobility',
    description:
      'Lightning-fast and brutally precise. Rogues strike from the shadows for guaranteed crits and can vanish when things go wrong.',
    baseStats: {
      hp: 90,  maxHp: 90,
      mp: 50,  maxMp: 50,
      atk: 12, def: 5,
      matk: 6, mdef: 5,
      spd: 14, luck: 9,
    },
    attributes: { str: 10, dex: 16, int: 10, con: 11 },
    starterWeaponId: 'twinDaggers',
    starterArmorId: 'shadowLeathers',
    startingSkillIds: ['shadowStrike', 'shadowStep'],
    levelUpGains: { maxHp: 5, maxMp: 2 },
    colorPrimary: '#8b5cf6',
    colorGlow: '#8b5cf655',
    abilities: [
      {
        name: 'Shadow Strike',
        cost: '15 MP',
        desc: 'A guaranteed critical hit — 250 % physical damage, always lands.',
      },
      {
        name: 'Shadow Step',
        cost: '20 MP',
        desc: 'Fade into the shadows — guaranteed escape from any battle.',
      },
    ],
  },

  paladin: {
    id: 'paladin',
    name: 'Holy Paladin',
    role: 'Divine Guardian, Smiter & Sustained Healer',
    description:
      'Righteous and resilient. Paladins smite evil with holy power while calling on divine grace to restore their own wounds.',
    baseStats: {
      hp: 110, maxHp: 110,
      mp: 70,  maxMp: 70,
      atk: 11, def: 8,
      matk: 9, mdef: 9,
      spd: 6,  luck: 6,
    },
    attributes: { str: 12, dex: 9, int: 12, con: 13 },
    starterWeaponId: 'warHammer',
    starterArmorId: 'paddedVest',
    startingSkillIds: ['holySmite', 'divineLight'],
    levelUpGains: { maxHp: 6, maxMp: 3 },
    colorPrimary: '#f0c040',
    colorGlow: '#f0c04055',
    abilities: [
      {
        name: 'Holy Smite',
        cost: '15 MP',
        desc: 'Strike with divine radiance — 180 % holy magic damage.',
      },
      {
        name: 'Divine Light',
        cost: '30 MP',
        desc: 'Channel holy grace to restore 40 % of your maximum HP.',
      },
    ],
  },
};

export const CLASS_LIST = Object.values(CLASSES);
