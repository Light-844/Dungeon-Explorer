import { useEffect } from 'react';
import { useGameStore } from './store';

/**
 * Ticks the terrain hazard timer once per second while the player is exploring.
 * Paused automatically during battles — pass `active = mode === 'exploring'`.
 */
export function useTerrainTick(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      useGameStore.getState().tickTerrainSecond();
    }, 1000);
    return () => clearInterval(id);
  }, [active]);
}
