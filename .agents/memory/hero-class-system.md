---
name: Hero Class System
description: How the 4-class system is structured, initialized, and integrated into store/combat.
---

## Architecture

- **`classData.ts`** — `ClassDef` interface + `CLASSES` record + `CLASS_LIST`. Single source of truth for base stats, starter gear, starting skills, level-up growth, UI colors.
- **`types.ts`** — `PlayerCharacter` now has `gender`, `heroClass`, `classAttributes`; `Skill` has `healPercent`, `guaranteedCrit`, `guaranteedFlee`.
- **`store.ts`** — `freshPlayer(name, gender, heroClass)` reads `CLASSES[heroClass]` to build player. `startNewGame(name, gender, heroClass)` signature. `BASE_PLAYER_STATS` and `STARTING_EQUIPMENT` removed from gameData imports.
- **`combatEngine.ts`** — `autoStatGainsForLevelUp(heroClass?)` returns class-specific gains. `rollCrit(luck, forced?)` supports Shadow Strike. `calcPhysicalDamage(atk, def, power, luck, forceCrit?)`.

## Class Skill Hooks

- `guaranteedCrit: true` → `shadowStrike` — always crits, passed as `forceCrit` to `calcPhysicalDamage`.
- `guaranteedFlee: true` → `shadowStep` — exits battle immediately, checked first in skill branch.
- `healPercent: 0.4` → `divineLight` — heals `maxHp * 0.4`, computed in battle skill self-target branch.

## Starter Gear IDs (per class)

- warrior: `ironLongsword` + `paddedVest`
- mage: `apprenticeWand` + `silkRobes`
- rogue: `twinDaggers` + `shadowLeathers`
- paladin: `warHammer` + `paddedVest`

**Why:** Class selection happens on the TitleScreen (3-step: identity → class → begin). All 4 class starter weapons/armors live in `EQUIPMENT` in gameData.ts.
