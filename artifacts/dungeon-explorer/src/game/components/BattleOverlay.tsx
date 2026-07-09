import { useState } from 'react';
import { Flame, Heart, Package, Shield, Sparkles, Swords, TowerControl } from 'lucide-react';
import { getAvailableSkills, getPlayerEffectiveStats, useGameStore } from '../store';

type Panel = 'root' | 'skills' | 'items';

export function BattleOverlay() {
  const battle = useGameStore((s) => s.battle);
  const player = useGameStore((s) => s.player);
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMp = useGameStore((s) => s.playerMp);
  const battleAction = useGameStore((s) => s.battleAction);
  const [panel, setPanel] = useState<Panel>('root');
  const [targetIndex, setTargetIndex] = useState(0);

  if (!battle) return null;
  const stats = getPlayerEffectiveStats(player);
  const skills = getAvailableSkills(player);
  const aliveEnemies = battle.enemies.filter((e) => e.stats.hp > 0);
  const effectiveTarget = Math.min(targetIndex, Math.max(0, battle.enemies.length - 1));

  function act(action: 'attack' | 'skill' | 'item' | 'defend' | 'flee', extra?: { skillId?: string; itemId?: string }) {
    battleAction(action, { ...extra, targetIndex: effectiveTarget });
    setPanel('root');
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-b from-black/20 via-black/10 to-black/70">
      {/* Enemy row */}
      <div className="flex flex-1 items-center justify-center gap-6 px-4 pt-16">
        {battle.enemies.map((enemy, idx) => (
          <button
            key={enemy.instanceId}
            type="button"
            disabled={enemy.stats.hp <= 0}
            onClick={() => setTargetIndex(idx)}
            className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-all ${
              enemy.stats.hp <= 0
                ? 'border-transparent opacity-30'
                : effectiveTarget === idx
                  ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(244,195,86,0.35)]'
                  : 'border-transparent hover-elevate'
            }`}
          >
            <div
              className="h-14 w-14 rounded-md sm:h-20 sm:w-20"
              style={{ backgroundColor: enemy.color, boxShadow: `0 0 24px ${enemy.color}55` }}
            />
            <div className="flex items-center gap-1.5 font-serif text-sm font-semibold text-foreground">
              <span>{enemy.name}</span>
              <span className="rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-sans font-normal text-muted-foreground">
                Lv.{enemy.level}
              </span>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-destructive transition-all"
                style={{ width: `${(enemy.stats.hp / enemy.stats.maxHp) * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Battle log */}
      <div className="mx-3 mb-2 max-h-24 overflow-y-auto rounded-lg border border-card-border bg-card/80 px-3 py-2 text-xs backdrop-blur sm:mx-4">
        {battle.log.slice(-5).map((entry) => (
          <div
            key={entry.id}
            className={
              entry.tone === 'damage'
                ? 'text-destructive'
                : entry.tone === 'heal'
                  ? 'text-chart-5'
                  : entry.tone === 'crit'
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground'
            }
          >
            {entry.text}
          </div>
        ))}
      </div>

      {/* Action panel */}
      <div className="mx-3 mb-3 rounded-xl border border-card-border bg-card/90 p-3 backdrop-blur sm:mx-4 sm:p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Heart size={13} className="text-destructive" /> {playerHp}/{stats.maxHp}
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-secondary" /> {playerMp}/{stats.maxMp}
          </span>
          {aliveEnemies.length > 0 && (
            <span>Target: {battle.enemies[effectiveTarget]?.name}</span>
          )}
        </div>

        {panel === 'root' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <ActionButton icon={<Swords size={16} />} label="Attack" onClick={() => act('attack')} />
            <ActionButton icon={<Flame size={16} />} label="Skill" onClick={() => setPanel('skills')} />
            <ActionButton icon={<Package size={16} />} label="Item" onClick={() => setPanel('items')} />
            <ActionButton icon={<Shield size={16} />} label="Defend" onClick={() => act('defend')} />
            <ActionButton icon={<TowerControl size={16} />} label="Flee" onClick={() => act('flee')} />
          </div>
        )}

        {panel === 'skills' && (
          <div className="flex flex-col gap-2">
            <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  disabled={skill.mpCost > playerMp}
                  onClick={() => act('skill', { skillId: skill.id })}
                  className="flex items-center justify-between rounded-md border border-card-border bg-card px-3 py-2 text-left text-xs hover-elevate active-elevate-2 disabled:opacity-40"
                >
                  <span>
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <span className="ml-1 text-muted-foreground">({skill.mpCost} MP)</span>
                  </span>
                  <span className="text-muted-foreground">{skill.element !== 'none' ? skill.element : skill.type}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPanel('root')}
              className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Back
            </button>
          </div>
        )}

        {panel === 'items' && (
          <div className="flex flex-col gap-2">
            <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {player.inventory
                .filter((s) => s.item.type !== 'key' && s.item.type !== 'material')
                .map((stack) => (
                  <button
                    key={stack.item.id}
                    type="button"
                    onClick={() => act('item', { itemId: stack.item.id })}
                    className="flex items-center justify-between rounded-md border border-card-border bg-card px-3 py-2 text-left text-xs hover-elevate active-elevate-2"
                  >
                    <span className="font-medium text-foreground">{stack.item.name}</span>
                    <span className="text-muted-foreground">x{stack.quantity}</span>
                  </button>
                ))}
              {player.inventory.filter((s) => s.item.type !== 'key' && s.item.type !== 'material').length === 0 && (
                <div className="text-xs text-muted-foreground">No usable items.</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPanel('root')}
              className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-md border border-card-border bg-card px-2 py-2.5 text-xs font-medium hover-elevate active-elevate-2"
    >
      {icon}
      {label}
    </button>
  );
}
