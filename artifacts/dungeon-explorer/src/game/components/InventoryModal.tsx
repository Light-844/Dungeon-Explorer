import { X } from 'lucide-react';
import { getPlayerEffectiveStats, useGameStore } from '../store';
import type { EquipSlot } from '../types';

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

export function InventoryModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const useItem = useGameStore((s) => s.useItem);
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

        <div>
          <h3 className="mb-2 font-serif text-sm font-semibold text-foreground">Equipment</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SLOTS.map((slot) => {
              const eq = player.equipment[slot];
              return (
                <div key={slot} className="rounded-md border border-card-border bg-background/40 p-2.5 text-xs">
                  <div className="mb-1 capitalize text-muted-foreground">{slot}</div>
                  <div className="font-medium text-foreground">{eq ? eq.name : 'None'}</div>
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
