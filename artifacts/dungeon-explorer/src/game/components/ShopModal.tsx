import { useState } from 'react';
import { Coins, Hammer, ShoppingBag, Sparkles, X } from 'lucide-react';
import { ITEMS, RECIPES } from '../gameData';
import { equipmentDisplayName, useGameStore } from '../store';

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

type Tab = 'buy' | 'sell' | 'craft' | 'upgrade';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'buy', label: 'Buy', icon: <ShoppingBag size={13} /> },
  { id: 'sell', label: 'Sell', icon: <Coins size={13} /> },
  { id: 'craft', label: 'Craft', icon: <Sparkles size={13} /> },
  { id: 'upgrade', label: 'Upgrade', icon: <Hammer size={13} /> },
];

const SLOT_LABEL: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory' };

// Must match the material quantity `upgradeEquipment` consumes per forge in store.ts.
const UPGRADE_MATERIAL_QTY = 2;

export function ShopModal({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const buyFromShop = useGameStore((s) => s.buyFromShop);
  const sellItem = useGameStore((s) => s.sellItem);
  const sellEquipment = useGameStore((s) => s.sellEquipment);
  const craftItem = useGameStore((s) => s.craftItem);
  const upgradeEquipment = useGameStore((s) => s.upgradeEquipment);
  const [tab, setTab] = useState<Tab>('buy');
  const [upgradeMaterial, setUpgradeMaterial] = useState<Record<string, string>>({});

  const materials = player.inventory.filter((s) => s.item.type === 'material');
  // Only materials the player actually has enough of to perform a forge upgrade.
  const upgradeableMaterials = materials.filter((s) => s.quantity >= UPGRADE_MATERIAL_QTY);

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

        <div className="flex gap-1.5 border-b border-card-border pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium hover-elevate active-elevate-2 ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-background/40 text-muted-foreground'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'buy' && (
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
        )}

        {tab === 'sell' && (
          <div className="flex flex-col gap-1.5">
            {player.inventory.length === 0 && player.equipmentInventory.length === 0 && (
              <div className="text-xs text-muted-foreground">Nothing to sell.</div>
            )}
            {player.inventory
              .filter((s) => s.item.type !== 'key')
              .map((stack) => {
                const price = Math.max(1, Math.floor(stack.item.value / 2));
                return (
                  <button
                    key={stack.item.id}
                    type="button"
                    onClick={() => sellItem(stack.item.id)}
                    className="flex items-center justify-between rounded-md border border-card-border bg-background/40 px-3 py-2 text-left text-xs hover-elevate active-elevate-2"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {stack.item.name} <span className="text-muted-foreground">x{stack.quantity}</span>
                      </div>
                    </div>
                    <span className="shrink-0 pl-2 font-mono text-primary">+{price}g</span>
                  </button>
                );
              })}
            {player.equipmentInventory.map((eq) => {
              const price = Math.max(1, Math.floor(eq.value / 2) * (1 + (eq.upgradeLevel ?? 0)));
              return (
                <button
                  key={eq.instanceUid}
                  type="button"
                  onClick={() => sellEquipment(eq.instanceUid!)}
                  className="flex items-center justify-between rounded-md border border-card-border bg-background/40 px-3 py-2 text-left text-xs hover-elevate active-elevate-2"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {equipmentDisplayName(eq)} <span className="text-muted-foreground">({eq.slot})</span>
                    </div>
                  </div>
                  <span className="shrink-0 pl-2 font-mono text-primary">+{price}g</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'craft' && (
          <div className="flex flex-col gap-1.5">
            {RECIPES.map((recipe) => {
              const canAfford = player.gold >= recipe.goldCost;
              const hasMaterials = recipe.materials.every((mat) => {
                const stack = player.inventory.find((s) => s.item.id === mat.itemId);
                return stack && stack.quantity >= mat.qty;
              });
              const resultItem = ITEMS[recipe.resultItemId]!;
              return (
                <button
                  key={recipe.id}
                  type="button"
                  disabled={!canAfford || !hasMaterials}
                  onClick={() => craftItem(recipe.id)}
                  className="flex flex-col gap-1 rounded-md border border-card-border bg-background/40 px-3 py-2 text-left text-xs hover-elevate active-elevate-2 disabled:opacity-40"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-foreground">
                      {recipe.resultQty > 1 ? `${recipe.resultQty}x ` : ''}
                      {resultItem.name}
                    </div>
                    <span className="shrink-0 pl-2 font-mono text-primary">{recipe.goldCost}g</span>
                  </div>
                  <div className="text-muted-foreground">{recipe.description}</div>
                  <div className="flex flex-wrap gap-1.5 text-muted-foreground">
                    {recipe.materials.map((mat) => {
                      const stack = player.inventory.find((s) => s.item.id === mat.itemId);
                      const have = stack?.quantity ?? 0;
                      return (
                        <span
                          key={mat.itemId}
                          className={have >= mat.qty ? 'text-foreground' : 'text-destructive'}
                        >
                          {ITEMS[mat.itemId]?.name ?? mat.itemId} {have}/{mat.qty}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'upgrade' && (
          <div className="flex flex-col gap-2">
            {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
              const eq = player.equipment[slot];
              const level = eq?.upgradeLevel ?? 0;
              const goldCost = 20 * (level + 1);
              const selectedMaterial =
                upgradeMaterial[slot] ?? upgradeableMaterials[0]?.item.id ?? '';
              const stack = player.inventory.find((s) => s.item.id === selectedMaterial);
              const haveEnough = (stack?.quantity ?? 0) >= UPGRADE_MATERIAL_QTY;
              return (
                <div key={slot} className="rounded-md border border-card-border bg-background/40 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-foreground">{SLOT_LABEL[slot]}</span>
                    <span className="text-muted-foreground">
                      {eq ? equipmentDisplayName(eq) : 'None equipped'}
                    </span>
                  </div>
                  {eq && (
                    <>
                      {level >= 5 ? (
                        <div className="text-muted-foreground">Fully upgraded.</div>
                      ) : upgradeableMaterials.length === 0 ? (
                        <div className="text-muted-foreground">
                          Need at least {UPGRADE_MATERIAL_QTY}x of a monster material to upgrade.
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedMaterial}
                            onChange={(e) =>
                              setUpgradeMaterial((prev) => ({ ...prev, [slot]: e.target.value }))
                            }
                            className="rounded-md border border-card-border bg-background px-2 py-1 text-xs"
                          >
                            {upgradeableMaterials.map((m) => (
                              <option key={m.item.id} value={m.item.id}>
                                {m.item.name} (x{m.quantity})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!haveEnough || player.gold < goldCost}
                            onClick={() => upgradeEquipment(slot, selectedMaterial)}
                            className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-medium text-primary hover-elevate active-elevate-2 disabled:opacity-40"
                          >
                            Forge (x2, {goldCost}g)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
