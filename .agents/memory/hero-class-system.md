---
name: Hero Class System
description: How the four base classes and Allrounder are structured, initialized, and integrated into store/combat.
---

## Architecture

- **`classData.ts`** — `ClassDef` interface + `CLASSES` record + `CLASS_LIST`. Single source of truth for base stats, starter gear, starting skills, level-up growth, UI colors.
- **`types.ts`** — `PlayerCharacter` now has `gender`, `heroClass`, `classAttributes`; `Skill` has `healPercent`, `guaranteedCrit`, `guaranteedFlee`.
- **`store.ts`** — `freshPlayer(name, gender, heroClass)` reads `CLASSES[heroClass]` to build player. `startNewGame(name, gender, heroClass)` signature. `BASE_PLAYER_STATS` and `STARTING_EQUIPMENT` removed from gameData imports.
- **`combatEngine.ts`** — `autoStatGainsForLevelUp(heroClass?)` returns class-specific gains. `rollCrit(luck, forced?)` supports Shadow Strike. `calcPhysicalDamage(atk, def, power, luck, forceCrit?)`.

## Class Skill Hooks

- `guaranteedCrit: true` → `shadowStrike` — always crits, passed as `forceCrit` to `calcPhysicalDamage`.
- `fieldOnly: true` → `shadowStep` — a 20 MP, three-tile facing-direction teleport for exploration; only Shadow Rogue may activate it.
- `healPercent: 0.4` → `divineLight` — heals `maxHp * 0.4`, computed in battle skill self-target branch.

## Skill Ownership

- Every player skill declares allowed class IDs in `Skill.classes`.
- Base-class skills are restricted to their listed class; boss-reward skills use `classes: ['all']`.
- Enemy-only skills use `classes: ['enemy']` and are not listed as player skills.
- Keep learning, save sanitation, menus, and combat execution behind the shared `canLearnSkill` rule.

**Why:** The user requires class identity to affect which abilities can be learned and used, while boss-core rewards remain available to every base class.

**How to apply:** When adding a skill or a new learning source, set its class list and use the shared rule at both the grant point and the combat execution boundary.

## Allrounder Rules

- Allrounder can learn skills assigned to any player class, but level-gated skills unlock at `ceil(baseUnlockLevel × 1.5)`.
- Shadow Step is a specific use restriction: even if Allrounder learns it at the scaled level, only Shadow Rogue can activate it.
- Its five creation points must be allocated to STR, DEX, INT, and CON before a run starts; those choices are recorded and cannot be changed during that run.
- Allrounder can equip every catalogued weapon family. Other classes use their explicit class weapon-family lists.
- Allrounder earns 2% less XP until earning the final-dungeon title, then the penalty is permanently cleared for that run.

**Why:** The user defined Allrounder as a flexible class whose broad access is balanced by slower learning, mandatory stat allocation, and a temporary XP penalty, and separately restricted Shadow Step to Shadow Rogue.

**How to apply:** Keep the same Allrounder rules in class creation, skill unlock calculations, equip validation, XP awards, and title/reward handling; enforce Shadow Step's Rogue-only use at the activation boundary.

## Starter Gear IDs (per class)

- warrior: `ironLongsword` + `paddedVest`
- mage: `apprenticeWand` + `silkRobes`
- rogue: `twinDaggers` + `shadowLeathers`
- paladin: `warHammer` + `paddedVest`
- allrounder: `ironLongsword` + `paddedVest`

**Why:** Class selection happens on the TitleScreen (3-step: identity → class → begin). All 4 class starter weapons/armors live in `EQUIPMENT` in gameData.ts.
