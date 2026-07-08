import { useEffect, useRef } from 'react';
import { useGameStore } from './store';

const MOVE_INTERVAL_MS = 150;

const KEY_DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  KeyW: { dx: 0, dy: -1 },
  KeyS: { dx: 0, dy: 1 },
  KeyA: { dx: -1, dy: 0 },
  KeyD: { dx: 1, dy: 0 },
};

// Grid-based movement: holds a key -> repeats moves on an interval.
export function useKeyboardMove(active: boolean) {
  const heldKey = useRef<string | null>(null);
  const lastMove = useRef(0);

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        const state = useGameStore.getState();
        const dungeon = state.dungeon;
        if (!dungeon) return;
        const tile = dungeon.tiles[state.playerPos.y]?.[state.playerPos.x];
        const adjacentTiles = [
          dungeon.tiles[state.playerPos.y]?.[state.playerPos.x + 1],
          dungeon.tiles[state.playerPos.y]?.[state.playerPos.x - 1],
          dungeon.tiles[state.playerPos.y + 1]?.[state.playerPos.x],
          dungeon.tiles[state.playerPos.y - 1]?.[state.playerPos.x],
        ];
        const chest =
          tile?.type === 'chest' ? tile : adjacentTiles.find((t) => t?.type === 'chest');
        const shop =
          tile?.type === 'shop' ? tile : adjacentTiles.find((t) => t?.type === 'shop');
        const stairs = tile?.type === 'stairsDown' ? tile : undefined;
        if (chest) state.openChest();
        else if (shop) state.interactShop();
        else if (stairs) state.descendStairs();
        return;
      }
      const dir = KEY_DIRECTIONS[e.code];
      if (!dir) return;
      e.preventDefault();
      if (heldKey.current !== e.code) {
        heldKey.current = e.code;
        lastMove.current = 0;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (heldKey.current === e.code) {
        heldKey.current = null;
      }
    }

    let raf: number;
    function tick(time: number) {
      if (heldKey.current) {
        const dir = KEY_DIRECTIONS[heldKey.current];
        if (dir && time - lastMove.current >= MOVE_INTERVAL_MS) {
          lastMove.current = time;
          useGameStore.getState().movePlayer(dir.dx, dir.dy);
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(raf);
      heldKey.current = null;
    };
  }, [active]);
}
