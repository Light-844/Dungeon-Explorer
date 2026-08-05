import { useState, useRef, useEffect } from 'react';
import { Swords, Wand2, Zap, Shield, User, ChevronRight, Flame } from 'lucide-react';
import { useGameStore } from '../store';
import { CLASS_LIST, type ClassDef } from '../classData';
import titleBg from '../../assets/title-bg.png';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const CLASS_ICONS: Record<string, React.ReactNode> = {
  warrior: <Swords size={20} />,
  mage:    <Wand2  size={20} />,
  rogue:   <Zap    size={20} />,
  paladin: <Shield size={20} />,
};

const DEFAULT_NAMES: Record<string, string> = {
  male:   'Rohit',
  female: 'Khushi',
};

/* ── Compact class button (one of 4 in a row) ──────────────────────────────── */
function ClassButton({
  cls,
  selected,
  onSelect,
}: {
  cls: ClassDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all w-full"
      style={
        selected
          ? {
              borderColor: cls.colorPrimary,
              backgroundColor: `${cls.colorPrimary}22`,
              boxShadow: `0 0 18px ${cls.colorGlow}`,
            }
          : {
              borderColor: 'var(--card-border)',
              backgroundColor: 'rgba(0,0,0,0.35)',
            }
      }
    >
      {/* Icon */}
      <span style={{ color: cls.colorPrimary }}>{CLASS_ICONS[cls.id]}</span>

      {/* Name */}
      <span className="font-serif text-sm font-semibold leading-tight text-foreground">
        {cls.name}
      </span>

      {/* HP / MP */}
      <div className="flex gap-2 text-[11px] font-mono">
        <span className="text-red-400">HP {cls.baseStats.maxHp}</span>
        <span className="text-blue-400">MP {cls.baseStats.maxMp}</span>
      </div>

      {/* Role badge */}
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight"
        style={{ backgroundColor: `${cls.colorPrimary}33`, color: cls.colorPrimary }}
      >
        {cls.role.split(/[,·&]/)[0]?.trim()}
      </span>
    </button>
  );
}

/* ── Skills panel (shown below row when a class is selected) ───────────────── */
function SkillsPanel({ cls }: { cls: ClassDef }) {
  return (
    <div
      className="w-full rounded-xl border p-4 mt-2 transition-all"
      style={{
        borderColor: cls.colorPrimary,
        backgroundColor: `${cls.colorPrimary}12`,
      }}
    >
      {/* Class description */}
      <p className="text-xs text-muted-foreground mb-3 italic leading-snug">
        {cls.description}
      </p>

      {/* Abilities */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
          Starting Abilities
        </div>
        {cls.abilities.map((ab) => (
          <div
            key={ab.name}
            className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 rounded-lg border px-3 py-2"
            style={{
              borderColor: `${cls.colorPrimary}44`,
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}
          >
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-xs text-foreground">{ab.name}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold"
                style={{ backgroundColor: `${cls.colorPrimary}33`, color: cls.colorPrimary }}
              >
                {ab.cost}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground leading-snug">{ab.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 1: Class selection ─────────────────────────────────────────────── */
function ClassScreen({
  selectedClass,
  onSelect,
  onBegin,
}: {
  selectedClass: string | null;
  onSelect: (id: string) => void;
  onBegin: () => void;
}) {
  const cls = selectedClass ? CLASS_LIST.find((c) => c.id === selectedClass) ?? null : null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-primary drop-shadow-lg">
          Choose Your Class
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a class to see its abilities, then begin your adventure.
        </p>
      </div>

      {/* 4-column class row */}
      <div className="grid grid-cols-4 gap-2">
        {CLASS_LIST.map((c) => (
          <ClassButton
            key={c.id}
            cls={c}
            selected={selectedClass === c.id}
            onSelect={() => onSelect(c.id)}
          />
        ))}
      </div>

      {/* Skills panel — only when a class is selected */}
      {cls && <SkillsPanel cls={cls} />}

      {/* Begin button */}
      <button
        type="button"
        disabled={!selectedClass}
        onClick={onBegin}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-primary-border bg-primary px-6 py-3 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_24px_rgba(244,195,86,0.35)] hover-elevate active-elevate-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Swords size={16} />
        Begin Your Adventure
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* ── Screen 2: Gender + Name ───────────────────────────────────────────────── */
function GenderScreen({
  name,
  gender,
  selectedClass,
  onName,
  onGender,
  onBack,
  onStart,
}: {
  name: string;
  gender: 'male' | 'female';
  selectedClass: string;
  onName: (v: string) => void;
  onGender: (v: 'male' | 'female') => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const cls = CLASS_LIST.find((c) => c.id === selectedClass);

  return (
    <div className="flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-card-border bg-card/90 p-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-xl font-semibold text-primary">Who Are You?</h2>
        {cls && (
          <p className="mt-1 text-xs text-muted-foreground">
            Your{' '}
            <span style={{ color: cls.colorPrimary }} className="font-semibold">
              {cls.name}
            </span>{' '}
            awaits a name.
          </p>
        )}
      </div>

      {/* Gender */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Gender
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                onGender(g);
                if (
                  name === DEFAULT_NAMES.male ||
                  name === DEFAULT_NAMES.female ||
                  name === ''
                ) {
                  onName(DEFAULT_NAMES[g]);
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                gender === g
                  ? 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(244,195,86,0.2)]'
                  : 'border-card-border bg-background/40 text-muted-foreground hover-elevate'
              }`}
            >
              <User size={14} />
              {g === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="hero-name"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Hero Name
        </label>
        <input
          id="hero-name"
          ref={inputRef}
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onStart();
          }}
          className="rounded-md border border-card-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          placeholder="Enter your name…"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!name.trim()}
          onClick={onStart}
          className="flex items-center justify-center gap-2 rounded-lg border border-primary-border bg-primary px-4 py-2.5 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_18px_rgba(244,195,86,0.25)] hover-elevate active-elevate-2 disabled:opacity-40"
        >
          Enter the Dungeon
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to class selection
        </button>
      </div>
    </div>
  );
}

/* ── Main TitleScreen ──────────────────────────────────────────────────────── */
export function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  const [step, setStep] = useState<'class' | 'gender'>('class');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [name, setName] = useState(DEFAULT_NAMES.male);

  function handleStart() {
    if (!name.trim() || !selectedClass) return;
    startNewGame(name.trim(), gender, selectedClass);
  }

  function handleGenderChange(g: 'male' | 'female') {
    setGender(g);
    if (name === DEFAULT_NAMES.male || name === DEFAULT_NAMES.female || name === '') {
      setName(DEFAULT_NAMES[g]);
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden bg-background px-4 pb-8 sm:justify-center sm:pb-4">
      {/* Background */}
      <img
        src={titleBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 35%' }}
      />
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

      {/* Ancient Echoes badge */}
      <div className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 flex items-center gap-2 text-accent [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
        <Flame size={13} />
        <span className="font-serif text-xs uppercase tracking-[0.35em]">Ancient Echoes</span>
        <Flame size={13} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center">
        {step === 'class' && (
          <ClassScreen
            selectedClass={selectedClass}
            onSelect={setSelectedClass}
            onBegin={() => setStep('gender')}
          />
        )}
        {step === 'gender' && selectedClass && (
          <GenderScreen
            name={name}
            gender={gender}
            selectedClass={selectedClass}
            onName={setName}
            onGender={handleGenderChange}
            onBack={() => setStep('class')}
            onStart={handleStart}
          />
        )}
      </div>

      {/* Controls hint */}
      {step === 'class' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="rounded-md border border-card-border bg-card/70 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
            Move: Arrows / WASD &nbsp;·&nbsp; Interact: Space / E
          </div>
        </div>
      )}
    </div>
  );
}
