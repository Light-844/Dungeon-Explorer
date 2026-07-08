import { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { useKeyboardMove } from '../useKeyboardMove';
import { DungeonCanvas } from './DungeonCanvas';
import { HUD } from './HUD';
import { BattleOverlay } from './BattleOverlay';
import { InventoryModal } from './InventoryModal';
import { ShopModal } from './ShopModal';
import { TitleScreen } from './TitleScreen';
import { GameOverScreen, VictoryScreen } from './EndScreens';

export default function GamePage() {
  const mode = useGameStore((s) => s.mode);
  const dungeon = useGameStore((s) => s.dungeon);
  const message = useGameStore((s) => s.message);
  const messageTone = useGameStore((s) => s.messageTone);
  const clearMessage = useGameStore((s) => s.clearMessage);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useKeyboardMove(mode === 'exploring');

  const isShopMessage = message === '__SHOP__';

  useEffect(() => {
    if (!message || isShopMessage) return;
    const timer = setTimeout(clearMessage, 2600);
    return () => clearTimeout(timer);
  }, [message, isShopMessage, clearMessage]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background text-foreground">
      {mode === 'title' && <TitleScreen />}

      {(mode === 'exploring' || mode === 'battle') && dungeon && (
        <>
          <DungeonCanvas dungeon={dungeon} />
          <HUD onOpenInventory={() => setInventoryOpen(true)} />

          {message && !isShopMessage && (
            <div
              className={`pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-md border px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
                messageTone === 'success'
                  ? 'border-chart-5/40 bg-chart-5/15 text-chart-5'
                  : messageTone === 'warning'
                    ? 'border-destructive/40 bg-destructive/15 text-destructive'
                    : 'border-card-border bg-card/85 text-foreground'
              }`}
            >
              {message}
            </div>
          )}

          {mode === 'exploring' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
              <div className="rounded-md border border-card-border bg-card/70 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                Move: Arrows/WASD &nbsp;·&nbsp; Interact (chest/shop/stairs): Space / E
              </div>
            </div>
          )}

          {mode === 'battle' && <BattleOverlay />}
          {inventoryOpen && <InventoryModal onClose={() => setInventoryOpen(false)} />}
          {isShopMessage && <ShopModal onClose={clearMessage} />}
        </>
      )}

      {mode === 'gameover' && <GameOverScreen />}
      {mode === 'victory' && <VictoryScreen />}
    </div>
  );
}
