import { Heart, Sparkles, UserRound } from 'lucide-react';
import { CLASSES } from '../classData';
import { getPlayerEffectiveStats, useGameStore } from '../store';

const STORY_LINES = [
  'The boss falls, and behind its throne you find a captive adventurer, weak but alive.',
  "They look up at you and whisper: 'Thank you. I thought no one would come.'",
];

export function CompanionRescueEvent() {
  const player = useGameStore((state) => state.player);
  const companion = useGameStore((state) => state.rescueEventCompanion);
  const storyIndex = useGameStore((state) => state.rescueStoryIndex);
  const advanceStory = useGameStore((state) => state.advanceRescueStory);
  const recruit = useGameStore((state) => state.recruitCompanion);
  const decline = useGameStore((state) => state.declineCompanion);

  if (!companion) return null;
  const classInfo = CLASSES[companion.heroClass];
  const stats = getPlayerEffectiveStats(companion);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <section
        aria-labelledby="rescue-event-title"
        className="w-full max-w-xl rounded-2xl border border-primary/40 bg-card/95 p-5 shadow-[0_0_48px_rgba(244,195,86,0.18)] sm:p-7"
      >
        <div className="mb-4 flex items-center gap-2 text-primary">
          <UserRound size={20} />
          <span className="text-xs font-bold uppercase tracking-[0.22em]">Floor 5 Rescue</span>
        </div>
        <h1 id="rescue-event-title" className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          A Stranger in Chains
        </h1>

        {storyIndex < STORY_LINES.length ? (
          <button
            type="button"
            onClick={advanceStory}
            className="mt-5 min-h-32 w-full rounded-xl border border-white/10 bg-black/25 p-5 text-left text-base leading-relaxed text-white transition-colors hover:bg-black/35 sm:text-lg"
          >
            {STORY_LINES[storyIndex]}
            <span className="mt-5 block text-right text-xs font-semibold uppercase tracking-widest text-primary">
              Tap to continue · {storyIndex + 1}/{STORY_LINES.length}
            </span>
          </button>
        ) : (
          <>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold text-white">{companion.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {companion.gender === 'male' ? 'Male' : 'Female'} · {classInfo?.name ?? companion.heroClass} · Level {companion.level}
                  </p>
                </div>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: `${classInfo?.colorPrimary ?? '#ffffff'}88`,
                    color: classInfo?.colorPrimary ?? '#ffffff',
                    backgroundColor: `${classInfo?.colorPrimary ?? '#ffffff'}18`,
                  }}
                >
                  {classInfo?.role ?? 'Adventurer'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/75">{classInfo?.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white">
                  <Heart size={15} className="text-rose-400" />
                  HP {companion.currentHp}/{stats.maxHp}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white">
                  <Sparkles size={15} className="text-sky-300" />
                  Mana {companion.currentMp}/{stats.maxMp}
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
                Attributes: STR {companion.classAttributes.str} · DEX {companion.classAttributes.dex} · INT {companion.classAttributes.int} · CON {companion.classAttributes.con}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={recruit}
                className="rounded-xl border border-primary/70 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Recruit to your party
              </button>
              <button
                type="button"
                onClick={decline}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Continue alone
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {player.name}, the choice is yours.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
