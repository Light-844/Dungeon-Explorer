import { Crown, Skull } from 'lucide-react';
import { useGameStore } from '../store';

export function GameOverScreen() {
  const returnToTitle = useGameStore((s) => s.returnToTitle);
  const player = useGameStore((s) => s.player);
  const dungeon = useGameStore((s) => s.dungeon);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <Skull size={48} className="text-destructive" />
      <h1 className="font-serif text-4xl font-bold text-destructive">You Have Fallen</h1>
      <p className="text-sm text-muted-foreground">
        {player.name} reached level {player.level} and fell on floor {dungeon?.floor ?? 1}.
      </p>
      <button
        type="button"
        onClick={returnToTitle}
        className="rounded-md border border-primary-border bg-primary px-6 py-3 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground hover-elevate active-elevate-2"
      >
        Return to Title
      </button>
    </div>
  );
}

export function VictoryScreen() {
  const returnToTitle = useGameStore((s) => s.returnToTitle);
  const player = useGameStore((s) => s.player);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <Crown size={48} className="text-primary" />
      <h1 className="font-serif text-4xl font-bold text-primary">Dungeon of Trials Cleared!</h1>
      <p className="text-sm text-muted-foreground">
        {player.name} cleared all ten floors of Dungeon of Trials at level {player.level} with {player.gold} gold.
      </p>
      {player.title && (
        <p className="font-serif text-sm font-semibold text-primary">
          Title earned: {player.title}
        </p>
      )}
      {player.heroClass === 'allrounder' && !player.expPenaltyActive && (
        <p className="max-w-md text-sm text-slate-200">
          Your versatility finally pays off! EXP penalty removed.
        </p>
      )}
      <button
        type="button"
        onClick={returnToTitle}
        className="rounded-md border border-primary-border bg-primary px-6 py-3 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground hover-elevate active-elevate-2"
      >
        Return to Title
      </button>
    </div>
  );
}
