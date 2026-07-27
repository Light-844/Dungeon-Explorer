import { Flame, Swords } from 'lucide-react';
import { useGameStore } from '../store';
import titleBg from '../../assets/title-bg.png';

export function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden bg-background px-4 pb-16 sm:justify-center sm:pb-4">
      <img
        src={titleBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 35%' }}
      />
      {/* Darkening gradient. Bottom 18% is solid dark to completely hide the
          "PRESS START" text that is baked into the artwork. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(220 45% 4% / 0.35) 0%, hsl(220 45% 4% / 0.15) 35%, hsl(220 45% 4% / 0.55) 68%, hsl(220 45% 3% / 0.97) 82%, hsl(220 45% 3% / 1) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 22%, hsl(195 90% 55% / 0.18), transparent 55%)',
        }}
      />

      {/* The title art already renders the "Dungeon Explorer / Ancient Echoes" logotype, so the
          overlay UI only adds the flavor line + controls lower on the frame and reserves the
          logo's own space up top, instead of stacking a duplicate text title on top of it. */}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-3 text-accent [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
          <Flame size={16} />
          <span className="font-serif text-xs uppercase tracking-[0.35em]">Ancient Echoes</span>
          <Flame size={16} />
        </div>
        <p className="max-w-md text-sm text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] sm:text-base">
          Descend five procedurally-generated floors, battle monsters in turn-based combat, loot
          treasure, and defeat the boss lurking in the depths.
        </p>
        <button
          type="button"
          onClick={startNewGame}
          className="mt-2 flex items-center gap-2 rounded-md border border-primary-border bg-primary px-6 py-3 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_28px_rgba(244,195,86,0.35)] hover-elevate active-elevate-2"
        >
          <Swords size={18} /> Begin Descent
        </button>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-white/70 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
          <span>Move: Arrow Keys / WASD</span>
          <span>Interact: Space / E</span>
        </div>
      </div>
    </div>
  );
}
