import { X } from 'lucide-react';
import { equipmentDisplayName, getPlayerEffectiveStats, useGameStore } from '../store';
import type { EquipSlot, Stats } from '../types';

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory'];
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  maxHp: 'HP',
  mp: 'MP',
  maxMp: 'MP',
  atk: 'ATK',
  def: 'DEF',
  matk: 'MATK',
  mdef: 'MDEF',
  spd: 'SPD',
  luck: 'LUK',
};

const ALLOCATABLE_STATS: (keyof Stats)[] = ['maxHp', 'maxMp', 'atk', 'def', 'matk', 'mdef', 'spd', 'luck'];

export function InventoryModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const useItem = useGameStore((s) => s.useItem);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const allocateStatPoint = useGameStore((s) => s.allocateStatPoint);
  const stats = getPlayerEffectiveStats(player);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-xl border border-card-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-primary">Inventory & Equipment</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover-elevate active-elevate-2">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-card-border bg-background/40 p-3 text-xs sm:grid-cols-4">
          {(Object.keys(stats) as (keyof typeof stats)[])
            .filter((k) => !['hp', 'mp'].includes(k))
            .map((key) => (
              <div key={key} className="flex flex-col">
                <span className="text-muted-foreground">{STAT_LABELS[key]}</span>
                <span className="font-mono font-medium text-foreground">{stats[key]}</span>
              </div>
            ))}
        </div>

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
                  +1 {STAT_LABELS[stat]}
                </button>
              ))}
            </div>
          </div>
        )}

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
                      {Object.entries(eq.statBonus)
                        .map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}`)
                        .join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
                      {equipmentDisplayName(eq)} <span className="text-muted-foreground">({eq.slot})</span>
                    </div>
                    <div className="text-muted-foreground">
                      {Object.entries(eq.statBonus)
                        .map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}`)
                        .join(', ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => equipItem(eq.instanceUid!)}
                    className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover-elevate active-elevate-2"
                  >
                    Equip
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 font-serif text-sm font-semibold text-foreground">Items</h3>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {player.inventory.length === 0 && (
              <div className="text-xs text-muted-foreground">Your pack is empty.</div>
            )}
            {player.inventory.map((stack) => {
              const usableOutsideBattle =
                stack.item.type === 'heal' || !!stack.item.mpAmount || !!stack.item.buffStat;
              return (
                <div
                  key={stack.item.id}
                  className="flex items-center justify-between rounded-md border border-card-border bg-background/40 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium text-foreground">{stack.item.name}</div>
                    <div className="text-muted-foreground">{stack.item.description}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    <span className="text-muted-foreground">x{stack.quantity}</span>
                    {usableOutsideBattle && (
                      <button
                        type="button"
                        onClick={() => useItem(stack.item.id)}
                        className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover-elevate active-elevate-2"
                      >
                        Use
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
