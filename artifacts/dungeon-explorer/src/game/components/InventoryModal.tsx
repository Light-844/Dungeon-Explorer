import { X } from 'lucide-react';
import { equipmentDisplayName, getPlayerEffectiveStats, useGameStore } from '../store';
import type { Equipment, EquipSlot, Stats } from '../types';

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory'];
const STAT_LABELS: Record<string, string> = {
  hp: 'HP', maxHp: 'Max HP', mp: 'MP', maxMp: 'Max MP',
  atk: 'ATK', def: 'DEF', matk: 'MATK', mdef: 'MDEF', spd: 'SPD', luck: 'LUK',
};
const ALLOCATABLE_STATS: (keyof Stats)[] = ['maxHp', 'maxMp', 'atk', 'def', 'matk', 'mdef', 'spd', 'luck'];

interface MergeGroup {
  eq1: Equipment;
  eq2: Equipment;
  key: string;
}

function buildMergeGroups(gear: Equipment[]): MergeGroup[] {
  const groups: MergeGroup[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < gear.length; i++) {
    for (let j = i + 1; j < gear.length; j++) {
      const a = gear[i]!;
      const b = gear[j]!;
      if (a.id !== b.id) continue;
      if ((a.upgradeLevel ?? 0) !== (b.upgradeLevel ?? 0)) continue;
      const key = `${a.instanceUid}-${b.instanceUid}`;
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ eq1: a, eq2: b, key });
      }
    }
  }
  return groups;
}

export function InventoryModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const useItem = useGameStore((s) => s.useItem);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const allocateStatPoint = useGameStore((s) => s.allocateStatPoint);
  const mergeEquipment = useGameStore((s) => s.mergeEquipment);
  const stats = getPlayerEffectiveStats(player);

  const mergeGroups = buildMergeGroups(player.equipmentInventory);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-xl border border-card-border bg-card p-4 shadow-2xl sm:gap-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">Inventory & Equipment</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover-elevate active-elevate-2">
            <X size={18} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-card-border bg-background/40 p-3 text-xs sm:grid-cols-4">
          {(Object.keys(stats) as (keyof typeof stats)[])
            .filter((k) => !['hp', 'mp'].includes(k))
            .map((key) => (
              <div key={key} className="flex flex-col">
                <span className="text-muted-foreground">{STAT_LABELS[key] ?? key}</span>
                <span className="font-mono font-medium text-foreground">{stats[key]}</span>
              </div>
            ))}
        </div>

        {/* Stat point allocation */}
        {player.statPoints > 0 && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
            <h3 className="mb-2 font-serif text-sm font-semibold text-amber-400">
              {player.statPoints} Stat Point{player.statPoints > 1 ? 's' : ''} Available
            </h3>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {ALLOCATABLE_STATS.map((stat) => (
                <button
                  key={stat}
                  type="button"
                  onClick={() => allocateStatPoint(stat)}
                  className="rounded-md border border-amber-400/40 bg-background/40 px-2 py-1.5 text-xs font-medium text-foreground hover-elevate active-elevate-2"
                >
                  +1 {STAT_LABELS[stat] ?? stat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Equipped slots */}
        <div>
          <h3 className="mb-2 font-serif text-sm font-semibold text-foreground">Equipment</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SLOTS.map((slot) => {
              const eq = player.equipment[slot];
              return (
                <div key={slot} className="rounded-md border border-card-border bg-background/40 p-2.5 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">{slot}</span>
                    {eq && (
                      <button
                        type="button"
                        onClick={() => unequipItem(slot)}
                        className="rounded-md border border-card-border bg-background/60 px-1.5 py-0.5 text-[10px] font-medium hover-elevate active-elevate-2"
                      >
                        Unequip
                      </button>
                    )}
                  </div>
                  <div className="font-medium text-foreground">{eq ? equipmentDisplayName(eq) : 'None'}</div>
                  {eq && (
                    <div className="mt-1 text-muted-foreground">
                      {Object.entries(eq.statBonus).map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}`).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Spare gear + merge */}
        {player.equipmentInventory.length > 0 && (
          <div>
            <h3 className="mb-2 font-serif text-sm font-semibold text-foreground">Spare Gear</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {player.equipmentInventory.map((eq) => (
                <div
                  key={eq.instanceUid}
                  className="flex items-center justify-between rounded-md border border-card-border bg-background/40 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium capitalize text-foreground">
                      {equipmentDisplayName(eq)}{' '}
                      <span className="text-muted-foreground">({eq.slot})</span>
                    </div>
                    <div className="text-muted-foreground">
                      {Object.entries(eq.statBonus).map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}`).join(', ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => equipItem(eq.instanceUid!)}
                    className="ml-2 shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover-elevate active-elevate-2"
                  >
                    Equip
                  </button>
                </div>
              ))}
            </div>

            {/* Merge section */}
            {mergeGroups.length > 0 && (
              <div className="mt-3 rounded-lg border border-secondary/30 bg-secondary/10 p-3">
                <h4 className="mb-2 font-serif text-xs font-semibold text-secondary">
                  ⚗ Merge — combine two identical pieces into one stronger item
                </h4>
                <div className="flex flex-col gap-1.5">
                  {mergeGroups.map(({ eq1, eq2, key }) => (
                    <div key={key} className="flex items-center justify-between rounded-md border border-card-border bg-background/40 px-3 py-2 text-xs">
                      <span className="text-foreground">
                        {equipmentDisplayName(eq1)} × 2 → {eq1.name} +{(eq1.upgradeLevel ?? 0) + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => mergeEquipment(eq1.instanceUid!, eq2.instanceUid!)}
                        className="ml-2 shrink-0 rounded-md border border-secondary/40 bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary hover-elevate active-elevate-2"
                      >
                        Merge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Consumable items */}
        <div>
          <h3 className="mb-2 font-serif text-sm font-semibold text-foreground">Items</h3>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {player.inventory.length === 0 && (
              <div className="text-xs text-muted-foreground">Your pack is empty.</div>
            )}
            {player.inventory.map((stack) => {
              const item = stack.item;
              const isBossCore = item.type === 'bossCore';
              const isTerrainResist = !!item.terrainResist;
              const usableOutsideBattle =
                item.type === 'heal' || !!item.mpAmount || !!item.buffStat || isBossCore || isTerrainResist;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
                    isBossCore
                      ? 'border-primary/40 bg-primary/5'
                      : isTerrainResist
                        ? 'border-chart-5/30 bg-chart-5/5'
                        : 'border-card-border bg-background/40'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground flex items-center gap-1">
                      {isBossCore && <span className="text-primary">★</span>}
                      {item.name}
                    </div>
                    <div className="text-muted-foreground truncate">{item.description}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    <span className="text-muted-foreground">x{stack.quantity}</span>
                    {usableOutsideBattle && (
                      <button
                        type="button"
                        onClick={() => useItem(item.id)}
                        className={`rounded-md border px-2 py-1 text-xs font-medium hover-elevate active-elevate-2 ${
                          isBossCore
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : isTerrainResist
                              ? 'border-chart-5/40 bg-chart-5/10 text-chart-5'
                              : 'border-primary/40 bg-primary/10 text-primary'
                        }`}
                      >
                        {isBossCore ? 'Absorb' : isTerrainResist ? 'Apply' : 'Use'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
