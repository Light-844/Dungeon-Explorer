import { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useGameStore } from '../store';
import { useKeyboardMove } from '../useKeyboardMove';
import { useMobWander } from '../useMobWander';
import { useTerrainTick } from '../useTerrainTick';
import { DungeonCanvas } from './DungeonCanvas';
import { HUD } from './HUD';
import { BattleOverlay } from './BattleOverlay';
import { InventoryModal } from './InventoryModal';
import { ShopModal } from './ShopModal';
import { TitleScreen } from './TitleScreen';
import { GameOverScreen, VictoryScreen } from './EndScreens';

// ── Touch D-pad ───────────────────────────────────────────────────────────────
function DPad() {
  const movePlayer = useGameStore((s) => s.movePlayer);

  function useDirButton(dx: number, dy: number) {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const onStart = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      movePlayer(dx, dy);
      intervalId = setInterval(() => movePlayer(dx, dy), 160);
    };
    const onEnd = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    return {
      onTouchStart: onStart,
      onTouchEnd: onEnd,
      onTouchCancel: onEnd,
      onMouseDown: onStart,
      onMouseUp: onEnd,
      onMouseLeave: onEnd,
    };
  }

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-0.5 select-none" style={{ width: 108, height: 108 }}>
      <div />
      <DPadBtn icon={<ChevronUp size={20} />} {...useDirButton(0, -1)} />
      <div />
      <DPadBtn icon={<ChevronLeft size={20} />} {...useDirButton(-1, 0)} />
      <div className="rounded-md bg-white/5" />
      <DPadBtn icon={<ChevronRight size={20} />} {...useDirButton(1, 0)} />
      <div />
      <DPadBtn icon={<ChevronDown size={20} />} {...useDirButton(0, 1)} />
      <div />
    </div>
  );
}

function DPadBtn({
  icon,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: {
  icon: React.ReactNode;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center rounded-md border border-white/15 bg-white/10 text-white/80 active:bg-white/25"
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {icon}
    </button>
  );
}

// ── Interact button ────────────────────────────────────────────────────────────
function InteractBtn() {
  const openChest = useGameStore((s) => s.openChest);
  const interactShop = useGameStore((s) => s.interactShop);
  const descendStairs = useGameStore((s) => s.descendStairs);
  const playerPos = useGameStore((s) => s.playerPos);
  const dungeon = useGameStore((s) => s.dungeon);

  function onPress() {
    if (!dungeon) return;
    const tile = dungeon.tiles[playerPos.y]?.[playerPos.x];
    const adj = [
      dungeon.tiles[playerPos.y]?.[playerPos.x + 1],
      dungeon.tiles[playerPos.y]?.[playerPos.x - 1],
      dungeon.tiles[playerPos.y + 1]?.[playerPos.x],
      dungeon.tiles[playerPos.y - 1]?.[playerPos.x],
    ];
    if (tile?.type === 'stairsDown') { descendStairs(); return; }
    if (tile?.type === 'chest' || adj.some((t) => t?.type === 'chest')) { openChest(); return; }
    if (tile?.type === 'shop' || adj.some((t) => t?.type === 'shop')) { interactShop(); }
  }

  return (
    <button
      type="button"
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onClick={onPress}
      className="flex h-10 items-center justify-center rounded-full border border-primary/50 bg-primary/20 px-4 text-xs font-semibold uppercase tracking-wide text-primary active:bg-primary/40"
      style={{ touchAction: 'none' }}
    >
      Interact
    </button>
  );
}

// ── Main GamePage ─────────────────────────────────────────────────────────────
export default function GamePage() {
  const mode = useGameStore((s) => s.mode);
  const dungeon = useGameStore((s) => s.dungeon);
  const message = useGameStore((s) => s.message);
  const messageTone = useGameStore((s) => s.messageTone);
  const clearMessage = useGameStore((s) => s.clearMessage);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const isExploring = mode === 'exploring';
  useKeyboardMove(isExploring);
  useMobWander(isExploring);
  // Terrain timer only ticks while exploring (not during battles)
  useTerrainTick(isExploring);

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
              className={`pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-md border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur sm:top-20 sm:text-sm ${
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
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 hidden justify-center sm:flex">
                <div className="rounded-md border border-card-border bg-card/70 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                  Move: Arrows/WASD &nbsp;·&nbsp; Interact: Space / E
                </div>
              </div>

              <div className="pointer-events-auto absolute bottom-4 left-4 z-20 [display:none] [@media(pointer:coarse)]:block">
                <DPad />
              </div>
              <div className="pointer-events-auto absolute bottom-6 right-4 z-20 flex flex-col items-end gap-2 [display:none] [@media(pointer:coarse)]:flex">
                <InteractBtn />
                <button
                  type="button"
                  onTouchStart={(e) => { e.preventDefault(); setInventoryOpen(true); }}
                  onClick={() => setInventoryOpen(true)}
                  className="flex h-10 items-center justify-center rounded-full border border-card-border bg-card/80 px-4 text-xs font-semibold uppercase tracking-wide text-foreground active:bg-card"
                  style={{ touchAction: 'none' }}
                >
                  Bag
                </button>
              </div>
            </>
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
