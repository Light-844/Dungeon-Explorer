import { Backpack, Coins, Heart, Sparkles, Swords } from 'lucide-react';
import { getPlayerEffectiveStats, useGameStore } from '../store';

function StatBar({
  value,
  max,
  colorClass,
  icon,
}: {
  value: number;
  max: number;
  colorClass: string;
  icon: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-current opacity-80">{icon}</span>
      <div className="h-2.5 w-32 overflow-hidden rounded-full bg-black/40 sm:w-40">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-foreground/80">
        {Math.max(0, Math.round(value))}/{max}
      </span>
    </div>
  );
}

export function HUD({ onOpenInventory }: { onOpenInventory: () => void }) {
  const player = useGameStore((s) => s.player);
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMp = useGameStore((s) => s.playerMp);
  const dungeon = useGameStore((s) => s.dungeon);
  const stats = getPlayerEffectiveStats(player);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-card/85 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-sm font-semibold tracking-wide text-primary">
              {player.name}
            </span>
            <span className="text-xs text-muted-foreground">Lv. {player.level}</span>
          </div>
          <div className="flex flex-col gap-1">
            <StatBar value={playerHp} max={stats.maxHp} colorClass="bg-destructive" icon={<Heart size={14} />} />
            <StatBar value={playerMp} max={stats.maxMp} colorClass="bg-secondary" icon={<Sparkles size={14} />} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Coins size={14} /> {player.gold}
          </div>
          <div className="text-xs text-muted-foreground">
            XP {player.xp}/{player.xpToNext}
          </div>
          {dungeon && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Swords size={12} /> Floor {dungeon.floor} — {dungeon.theme.name}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenInventory}
          className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-primary-border bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover-elevate active-elevate-2"
        >
          <Backpack size={14} /> Inventory
        </button>
      </div>
    </div>
  );
}
