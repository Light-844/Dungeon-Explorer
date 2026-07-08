---
name: Turn-based battle state cloning
description: Why turn-based battle logic in R3F/zustand games must clone enemy/actor instances before mutating stats
---

When a turn-based battle pulls a live enemy/actor object out of the exploration world state (e.g. a
dungeon's enemy registry) to fight it, always deep-clone that instance (and its nested `stats` object)
before the battle loop starts, and again before each turn's mutation.

**Why:** Reusing the same object reference lets in-battle stat mutations (`enemy.stats.hp -= dmg`, etc.)
silently corrupt the exploration-mode world state even when using an immutable-style store like zustand.
Symptoms are hard to reproduce: fleeing a fight leaves the world enemy partially damaged or in an
inconsistent state, and re-entering battle can read stale/partial data. A code-review pass caught this
class of bug in a dungeon-crawler build's turn-based combat.

**How to apply:** On battle start, map world actors into fresh battle-local objects with their own
`stats` copies. Only write back to the world's canonical registry at defined transition points (e.g. on
victory: delete the defeated entry; on flee: explicitly decide whether wounds persist, don't rely on
incidental reference sharing).
