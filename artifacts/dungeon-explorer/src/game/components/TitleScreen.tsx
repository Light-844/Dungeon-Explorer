import { Flame, Swords } from 'lucide-react';
import { useGameStore } from '../store';

export function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, hsl(38 92% 30% / 0.35), transparent 60%), radial-gradient(circle at 20% 80%, hsl(265 45% 25% / 0.3), transparent 55%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3 text-primary">
          <Flame size={28} />
          <span className="font-serif text-xs uppercase tracking-[0.3em]">Torchlit Depths</span>
          <Flame size={28} />
        </div>
        <h1 className="font-serif text-5xl font-bold tracking-wide text-foreground sm:text-6xl">
          Dungeon Explorer
        </h1>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">
          Descend five procedurally-generated floors, battle monsters in turn-based combat, loot
          treasure, and defeat the boss lurking in the depths.
        </p>
        <button
          type="button"
          onClick={startNewGame}
          className="mt-2 flex items-center gap-2 rounded-md border border-primary-border bg-primary px-6 py-3 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground hover-elevate active-elevate-2"
        >
          <Swords size={18} /> Begin Descent
        </button>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
          <span>Move: Arrow Keys / WASD</span>
          <span>Interact: Space / E</span>
        </div>
      </div>
    </div>
  );
}
