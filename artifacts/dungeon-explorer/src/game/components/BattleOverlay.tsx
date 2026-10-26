import { useState, useEffect } from 'react';
import { Flame, Heart, Package, Shield, Sparkles, Swords, TowerControl } from 'lucide-react';
import { getAvailableSkills, getPlayerEffectiveStats, useGameStore } from '../store';
import type { CompanionBattleAction } from '../types';

type Panel = 'root' | 'skills' | 'items';

export function BattleOverlay() {
  const battle = useGameStore((s) => s.battle);
  const player = useGameStore((s) => s.player);
  const companion = useGameStore((s) => s.companion);
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMp = useGameStore((s) => s.playerMp);
  const battleAction = useGameStore((s) => s.battleAction);
  const finishVictoryBattle = useGameStore((s) => s.finishVictoryBattle);
  const [panel, setPanel] = useState<Panel>('root');
  const [targetIndex, setTargetIndex] = useState(0);
  const [companionAction, setCompanionAction] = useState<CompanionBattleAction | null>(null);

  // Auto-advance target to the next alive enemy whenever the current one dies.
  useEffect(() => {
    if (!battle) return;
    const alive = battle.enemies.findIndex((e) => e.stats.hp > 0);
    if (alive >= 0 && battle.enemies[targetIndex]?.stats.hp <= 0) {
      setTargetIndex(alive);
    }
  }, [battle, targetIndex]);

  if (!battle) return null;
  if (battle.victory) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl border border-primary/40 bg-card/95 p-5 shadow-2xl sm:p-7">
          <h2 className="mb-1 text-center font-serif text-2xl font-bold text-primary">Victory!</h2>
          <p className="mb-4 text-center text-xs text-muted-foreground">
            Your companion reached a new level. Battle results are in the combat log.
          </p>
          <div
            role="log"
            aria-label="Combat log"
            aria-live="polite"
            className="mb-4 max-h-44 overflow-y-auto rounded-lg border border-card-border bg-background/70 px-3 py-2 text-xs"
          >
            {battle.log.slice(-8).map((entry) => (
              <div
                key={entry.id}
                className={entry.text.includes('reached Level') ? 'font-semibold text-secondary' : 'text-muted-foreground'}
              >
                {entry.text}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={finishVictoryBattle}
            className="w-full rounded-lg border border-primary/50 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover-elevate active-elevate-2"
          >
            Continue Exploring
          </button>
        </div>
      </div>
    );
  }
  const stats = getPlayerEffectiveStats(player);
  const skills = getAvailableSkills(player).filter((skill) => !skill.fieldOnly);
  const companionStats = companion ? getPlayerEffectiveStats(companion) : null;
  const companionSkills = companion
    ? getAvailableSkills(companion).filter((skill) => !skill.fieldOnly)
    : [];
  const aliveEnemies = battle.enemies.filter((e) => e.stats.hp > 0);
  const effectiveTarget = (() => {
    if (battle.enemies[targetIndex]?.stats.hp > 0) return targetIndex;
    const first = battle.enemies.findIndex((e) => e.stats.hp > 0);
    return first >= 0 ? first : 0;
  })();

  function act(
    action: 'attack' | 'skill' | 'item' | 'defend' | 'flee',
    extra?: {
      skillId?: string;
      itemId?: string;
      itemSource?: 'player' | 'companion';
      itemTarget?: 'player' | 'companion';
    },
  ) {
    battleAction(action, {
      ...extra,
      targetIndex: effectiveTarget,
      companionAction: companionAction ?? undefined,
    });
    setPanel('root');
    setCompanionAction(null);
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

        {companion && companionStats && (
          <section className="mb-3 rounded-lg border border-secondary/25 bg-secondary/5 p-2.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-foreground">
                {companion.name} · Lv. {companion.level}
                {companion.isKnockedOut
                  ? <span className="ml-2 text-destructive">Knocked out</span>
                  : <span className="ml-2 text-muted-foreground">{companion.currentHp}/{companionStats.maxHp} HP · {companion.currentMp}/{companionStats.maxMp} MP</span>}
              </div>
              <span className="text-[10px] text-muted-foreground">
                Companion action: {companionAction?.type === 'skill'
                  ? companionSkills.find((skill) => skill.id === companionAction.skillId)?.name ?? 'Skill'
                  : companionAction?.type === 'attack' ? 'Basic attack' : 'Basic attack (default)'}
              </span>
            </div>
            {!companion.isKnockedOut && (
              <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setCompanionAction({ type: 'attack', targetIndex: effectiveTarget })}
                  className={`rounded-md border px-2 py-1.5 text-[11px] font-medium ${
                    companionAction?.type === 'attack'
                      ? 'border-secondary bg-secondary/20 text-foreground'
                      : 'border-card-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Basic attack
                </button>
                {companionSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    disabled={skill.mpCost > companion.currentMp}
                    onClick={() => setCompanionAction({
                      type: 'skill',
                      skillId: skill.id,
                      targetIndex: effectiveTarget,
                    })}
                    className={`rounded-md border px-2 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-35 ${
                      companionAction?.type === 'skill' && companionAction.skillId === skill.id
                        ? 'border-secondary bg-secondary/20 text-foreground'
                        : 'border-card-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {skill.name} · {skill.mpCost} MP
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

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
              {[
                ...player.inventory
                  .filter((stack) => stack.item.type !== 'key' && stack.item.type !== 'material')
                  .map((stack) => ({ stack, source: 'player' as const })),
                ...(companion?.inventory
                  .filter((stack) => stack.item.type === 'heal' && (!!stack.item.healAmount || !!stack.item.mpAmount))
                  .map((stack) => ({ stack, source: 'companion' as const })) ?? []),
              ].map(({ stack, source }) => {
                const item = stack.item;
                const isPotion = item.type === 'heal' && (!!item.healAmount || !!item.mpAmount);
                return (
                  <div
                    key={`${source}:${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-card-border bg-card px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {item.name} <span className="text-muted-foreground">x{stack.quantity}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {source === 'player' && (
                        <button
                          type="button"
                          onClick={() => act('item', {
                            itemId: item.id,
                            itemSource: 'player',
                            itemTarget: 'player',
                          })}
                          className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-medium text-primary hover-elevate active-elevate-2"
                        >
                          Use
                        </button>
                      )}
                      {isPotion && companion && (
                        <button
                          type="button"
                          onClick={() => act('item', {
                            itemId: item.id,
                            itemSource: source,
                            itemTarget: 'companion',
                          })}
                          className="rounded-md border border-secondary/40 bg-secondary/10 px-2 py-1 font-medium text-secondary hover-elevate active-elevate-2"
                        >
                          Use on {companion.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {player.inventory.filter((s) => s.item.type !== 'key' && s.item.type !== 'material').length === 0 &&
                !companion?.inventory.some((stack) => stack.item.type === 'heal' && (!!stack.item.healAmount || !!stack.item.mpAmount)) && (
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
