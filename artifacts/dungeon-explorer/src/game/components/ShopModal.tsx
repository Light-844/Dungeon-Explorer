import { Coins, X } from 'lucide-react';
import { ITEMS } from '../gameData';
import { useGameStore } from '../store';

const SHOP_ITEM_IDS = [
  'smallPotion',
  'largePotion',
  'manaDraught',
  'strengthPotion',
  'defensePotion',
  'speedPotion',
  'fireBomb',
  'iceCrystal',
  'reviveScroll',
];

export function ShopModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const buyFromShop = useGameStore((s) => s.buyFromShop);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl border border-card-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-primary">Wandering Merchant</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover-elevate active-elevate-2">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-primary">
          <Coins size={15} /> {player.gold} gold
        </div>
        <div className="flex flex-col gap-1.5">
          {SHOP_ITEM_IDS.map((id) => {
            const item = ITEMS[id]!;
            const canAfford = player.gold >= item.value;
            return (
              <button
                key={id}
                type="button"
                disabled={!canAfford}
                onClick={() => buyFromShop(id)}
                className="flex items-center justify-between rounded-md border border-card-border bg-background/40 px-3 py-2 text-left text-xs hover-elevate active-elevate-2 disabled:opacity-40"
              >
                <div>
                  <div className="font-medium text-foreground">{item.name}</div>
                  <div className="text-muted-foreground">{item.description}</div>
                </div>
                <span className="shrink-0 pl-2 font-mono text-primary">{item.value}g</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
