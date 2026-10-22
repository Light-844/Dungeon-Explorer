import { useState } from 'react';
import { Backpack, Coins, Flame, Heart, Snowflake, Sparkles, Star, Swords, Wind } from 'lucide-react';
import { getPlayerEffectiveStats, useGameStore } from '../store';
import { CLASSES } from '../classData';
import { SKILLS } from '../gameData';
import type { CompanionCharacter } from '../types';

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

function TerrainStatus() {
  const dungeon = useGameStore((s) => s.dungeon);
  const terrainTimerSeconds = useGameStore((s) => s.terrainTimerSeconds);
  const terrainDamaging = useGameStore((s) => s.terrainDamaging);
  const terrainResistSeconds = useGameStore((s) => s.terrainResistSeconds);

  const themeId = dungeon?.theme.id;
  const isHot = themeId === 'lavaCavern';
  const isCold = themeId === 'frozenCatacombs';
  const isSwamp = themeId === 'undergroundSwamp';

  if (!isHot && !isCold && !isSwamp) return null;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {/* Hot/cold hazard */}
      {(isHot || isCold) && (
        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            terrainResistSeconds > 0
              ? 'border-chart-5/40 bg-chart-5/10 text-chart-5'
              : terrainDamaging
                ? 'border-destructive/60 bg-destructive/20 text-destructive animate-pulse'
                : 'border-amber-400/40 bg-amber-400/10 text-amber-400'
          }`}
        >
          {isHot ? <Flame size={10} /> : <Snowflake size={10} />}
          {terrainResistSeconds > 0 ? (
            <span>Resist {fmtTime(terrainResistSeconds)}</span>
          ) : terrainDamaging ? (
            <span>{isHot ? 'Scorching!' : 'Freezing!'}</span>
          ) : (
            <span>{isHot ? 'Heat' : 'Cold'}: {fmtTime(terrainTimerSeconds ?? 0)}</span>
          )}
        </div>
      )}

      {/* Swamp slow */}
      {isSwamp && (
        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            terrainResistSeconds > 0
              ? 'border-chart-5/40 bg-chart-5/10 text-chart-5'
              : 'border-secondary/40 bg-secondary/10 text-secondary'
          }`}
        >
          <Wind size={10} />
          {terrainResistSeconds > 0 ? (
            <span>Resist {fmtTime(terrainResistSeconds)}</span>
          ) : (
            <span>Swamp Slow</span>
          )}
        </div>
      )}
    </div>
  );
}

function CompanionPartyCard({ companion }: { companion: CompanionCharacter }) {
  const [expanded, setExpanded] = useState(true);
  const stats = getPlayerEffectiveStats(companion);
  const cls = CLASSES[companion.heroClass];

  return (
    <div className="min-w-[210px] flex-1 rounded-lg border border-secondary/25 bg-background/30 p-2.5">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-serif text-sm font-semibold text-foreground">
            {companion.name}
          </span>
          <span className="block text-[10px] text-muted-foreground">
            {cls?.name ?? companion.heroClass} · Lv. {companion.level}
          </span>
        </span>
        <span className={`shrink-0 text-[10px] font-semibold ${companion.isKnockedOut ? 'text-destructive' : 'text-secondary'}`}>
          {companion.isKnockedOut ? 'Knocked out' : expanded ? 'Hide details' : 'Details'}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-1.5">
          <StatBar
            value={companion.currentHp}
            max={stats.maxHp}
            colorClass="bg-destructive"
            icon={<Heart size={12} />}
          />
          <StatBar
            value={companion.currentMp}
            max={stats.maxMp}
            colorClass="bg-secondary"
            icon={<Sparkles size={12} />}
          />
          <div className="border-t border-white/10 pt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            Attributes: STR {companion.classAttributes.str} · DEX {companion.classAttributes.dex} · INT {companion.classAttributes.int} · CON {companion.classAttributes.con}
            <br />
            Skills: {companion.skillIds.map((id) => SKILLS[id]?.name ?? id).join(', ') || 'Basic attack'}
            {companion.isKnockedOut && (
              <span className="mt-1 block font-semibold text-destructive">
                Revives with 30% HP on the next floor.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function HUD({ onOpenInventory }: { onOpenInventory: () => void }) {
  const player = useGameStore((s) => s.player);
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMp = useGameStore((s) => s.playerMp);
  const dungeon = useGameStore((s) => s.dungeon);
  const companion = useGameStore((s) => s.companion);
  const mode = useGameStore((s) => s.mode);
  const useExplorationSkill = useGameStore((s) => s.useExplorationSkill);
  const stats = getPlayerEffectiveStats(player);
  const shadowStepCost = SKILLS.shadowStep?.mpCost ?? 20;
  const canUseShadowStep =
    mode === 'exploring' &&
    player.heroClass === 'rogue' &&
    player.skillIds.includes('shadowStep');

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
      <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-3 rounded-xl border border-card-border bg-card/85 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-sm font-semibold tracking-wide text-primary">
              {player.name}
            </span>
            <span className="text-xs text-muted-foreground">Lv. {player.level}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {CLASSES[player.heroClass]?.name ?? player.heroClass}
          </span>
          <div className="flex flex-col gap-1">
            <StatBar value={playerHp} max={stats.maxHp} colorClass="bg-destructive" icon={<Heart size={14} />} />
            <StatBar value={playerMp} max={stats.maxMp} colorClass="bg-secondary" icon={<Sparkles size={14} />} />
          </div>
          <TerrainStatus />
        </div>

        {companion && <CompanionPartyCard companion={companion} />}

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Coins size={14} /> {player.gold}
          </div>
          <StatBar
            value={player.xp}
            max={player.xpToNext}
            colorClass="bg-amber-400"
            icon={<Star size={14} />}
          />
          {player.statPoints > 0 && (
            <div className="text-xs font-semibold text-amber-400">
              {player.statPoints} stat point{player.statPoints > 1 ? 's' : ''} available!
            </div>
          )}
          {player.expPenaltyActive && (
            <div className="text-[10px] font-semibold text-amber-300">
              EXP -2% (until first title)
            </div>
          )}
          {dungeon && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Swords size={12} /> Floor {dungeon.floor} — {dungeon.theme.name}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canUseShadowStep && (
            <button
              type="button"
              disabled={playerMp < shadowStepCost}
              onClick={() => useExplorationSkill('shadowStep')}
              title="Teleport three tiles in your facing direction. Traps can be crossed without triggering them."
              className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wind size={14} /> Shadow Step · {shadowStepCost} MP
            </button>
          )}
          <button
            type="button"
            onClick={onOpenInventory}
            className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-primary-border bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover-elevate active-elevate-2"
          >
            <Backpack size={14} /> Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
