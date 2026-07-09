---
name: Equipment instance identity in loot/RPG systems
description: Why per-item-instance identity (unique id, independent upgrade level) must be assigned at every entry point where equipment enters player state
---

Any RPG-style system that lets players hold multiple copies of "the same" equipment (loot drops,
crafting outputs, starting gear) needs a per-instance unique id assigned at *every* point an
equipment object enters player state — not just the obvious "loot drop" path.

**Why:** A code-review pass on a dungeon-crawler found that starting equipment was seeded directly
from shared template objects without cloning/assigning an instance id, while looted equipment was
correctly cloned. Once the starting item was unequipped into the spare-gear inventory, it had an
`undefined` instance id, colliding with any other uninstanced item and making equip/sell actions
target the wrong entry. The bug was invisible until a manual review traced instance-id assignment
across all entry points, not just the primary loot flow.

**How to apply:** When adding "gear inventory" / upgrade-instance concepts, grep every place a
template (`EQUIPMENT[...]`, `STARTING_EQUIPMENT`, etc.) is assigned into player-owned state and
route it through the same clone-with-fresh-id helper. Never spread a template object directly into
player state if the system elsewhere assumes instance-level identity.
