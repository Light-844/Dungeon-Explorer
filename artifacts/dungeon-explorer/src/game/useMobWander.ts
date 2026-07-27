import { useEffect } from 'react';
import { useGameStore } from './store';

const WANDER_INTERVAL_MS = 2000;

/**
 * Starts a recurring timer that steps every non-boss mob one tile in a random
 * direction. Only runs while the player is exploring (not in battle).
 */
export function useMobWander(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      useGameStore.getState().tickMobWander();
    }, WANDER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);
}
