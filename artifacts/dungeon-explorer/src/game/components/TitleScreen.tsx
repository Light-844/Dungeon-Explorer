import { useState, useRef, useEffect } from 'react';
import { ChevronRight, Flame, Swords, User, Wand2, Zap, Shield } from 'lucide-react';
import { useGameStore } from '../store';
import { CLASS_LIST, type ClassDef } from '../classData';
import titleBg from '../../assets/title-bg.png';

type Step = 'identity' | 'class' | 'confirm';

const CLASS_ICONS: Record<string, React.ReactNode> = {
  warrior: <Swords size={22} />,
  mage:    <Wand2  size={22} />,
  rogue:   <Zap    size={22} />,
  paladin: <Shield size={22} />,
};

const DEFAULT_NAMES: Record<string, string> = {
  male:   'Rohit',
  female: 'Khushi',
};

// ── Identity step (Name + Gender) ────────────────────────────────────────────
function IdentityStep({
  name,
  gender,
  onName,
  onGender,
  onNext,
}: {
  name: string;
  gender: 'male' | 'female';
  onName: (v: string) => void;
  onGender: (v: 'male' | 'female') => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-card-border bg-card/90 p-6 shadow-2xl backdrop-blur-md">
      <div className="text-center">
        <h2 className="font-serif text-xl font-semibold text-primary">Begin Your Adventure</h2>
        <p className="mt-1 text-xs text-muted-foreground">Choose your identity before descending.</p>
      </div>

      {/* Gender selection */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                onGender(g);
                // Only auto-fill name if it's still one of the defaults
                if (name === DEFAULT_NAMES.male || name === DEFAULT_NAMES.female || name === '') {
                  onName(DEFAULT_NAMES[g]);
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                gender === g
                  ? 'border-primary bg-primary/20 text-primary shadow-[0_0_16px_rgba(244,195,86,0.2)]'
                  : 'border-card-border bg-background/40 text-muted-foreground hover-elevate'
              }`}
            >
              <User size={15} />
              {g === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Name input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="hero-name">
          Hero Name
        </label>
        <input
          id="hero-name"
          ref={inputRef}
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onNext(); }}
          className="rounded-md border border-card-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          placeholder="Enter your name…"
        />
      </div>

      <button
        type="button"
        disabled={!name.trim()}
        onClick={onNext}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-primary-border bg-primary px-4 py-2.5 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_20px_rgba(244,195,86,0.25)] hover-elevate active-elevate-2 disabled:opacity-40"
      >
        Choose Your Class <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Individual class card ─────────────────────────────────────────────────────
function ClassCard({
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
      className={`flex w-full flex-col gap-2 rounded-xl border p-3 text-left transition-all sm:p-4 ${
        selected
          ? 'border-2 shadow-[0_0_22px_var(--glow)]'
          : 'border-card-border bg-background/40 hover-elevate'
      }`}
      style={
        selected
          ? ({
              '--glow': cls.colorGlow,
              borderColor: cls.colorPrimary,
              backgroundColor: `${cls.colorPrimary}18`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ color: cls.colorPrimary }}>{CLASS_ICONS[cls.id]}</span>
            <span className="font-serif text-sm font-semibold text-foreground sm:text-base">{cls.name}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{cls.role}</div>
        </div>
        {selected && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
            style={{ backgroundColor: cls.colorPrimary, color: '#000' }}
          >
            Selected
          </span>
        )}
      </div>

      {/* Vitals row */}
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-destructive">
          <span className="opacity-70">HP</span>
          <span className="font-mono font-semibold">{cls.baseStats.maxHp}</span>
        </span>
        <span className="flex items-center gap-1 text-secondary">
          <span className="opacity-70">MP</span>
          <span className="font-mono font-semibold">{cls.baseStats.maxMp}</span>
        </span>
        <span className="ml-auto flex gap-2 text-muted-foreground">
          {Object.entries(cls.attributes).map(([k, v]) => (
            <span key={k} className="flex gap-0.5">
              <span className="uppercase opacity-60">{k}</span>
              <span className="font-semibold text-foreground">{v}</span>
            </span>
          ))}
        </span>
      </div>

      {/* Abilities */}
      <div className="flex flex-col gap-1">
        {cls.abilities.map((ab) => (
          <div key={ab.name} className="rounded-md border border-white/8 bg-white/5 px-2 py-1 text-[10px] sm:text-xs">
            <span className="font-semibold text-foreground">{ab.name}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span style={{ color: cls.colorPrimary }} className="font-mono">{ab.cost}</span>
            <span className="block text-muted-foreground sm:inline sm:ml-1 truncate">{ab.desc}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

// ── Class selection step ──────────────────────────────────────────────────────
function ClassStep({
  selectedClass,
  onSelect,
  onBack,
  onBegin,
  heroName,
}: {
  selectedClass: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onBegin: () => void;
  heroName: string;
}) {
  const cls = selectedClass ? CLASS_LIST.find((c) => c.id === selectedClass) : null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="rounded-2xl border border-card-border bg-card/90 p-4 shadow-2xl backdrop-blur-md sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-primary">Choose Your Class</h2>
            <p className="text-xs text-muted-foreground">
              {heroName ? `Welcome, ${heroName}. ` : ''}Pick the hero that suits your playstyle.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CLASS_LIST.map((c) => (
            <ClassCard
              key={c.id}
              cls={c}
              selected={selectedClass === c.id}
              onSelect={() => onSelect(c.id)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!selectedClass}
        onClick={onBegin}
        className="flex items-center justify-center gap-2 rounded-xl border border-primary-border bg-primary px-6 py-3.5 font-serif text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_28px_rgba(244,195,86,0.35)] hover-elevate active-elevate-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Swords size={18} />
        {cls ? `Begin as ${cls.name}` : 'Select a Class to Begin'}
      </button>
    </div>
  );
}

// ── Main TitleScreen ──────────────────────────────────────────────────────────
export function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  const [step, setStep] = useState<Step>('identity');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [name, setName] = useState(DEFAULT_NAMES.male);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  function handleBegin() {
    if (!name.trim() || !selectedClass) return;
    startNewGame(name.trim(), gender, selectedClass);
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden bg-background px-4 pb-8 sm:justify-center sm:pb-4">
      {/* Background art */}
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
        style={{ background: 'radial-gradient(circle at 50% 22%, hsl(195 90% 55% / 0.18), transparent 55%)' }}
      />

      {/* Sub-title badge (visible on identity step) */}
      {step === 'identity' && (
        <div className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 flex items-center gap-2 text-accent [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
          <Flame size={14} />
          <span className="font-serif text-xs uppercase tracking-[0.35em]">Ancient Echoes</span>
          <Flame size={14} />
        </div>
      )}

      {/* Content area */}
      <div className="relative z-10 flex w-full flex-col items-center gap-4">
        {step === 'identity' && (
          <IdentityStep
            name={name}
            gender={gender}
            onName={setName}
            onGender={(g) => {
              setGender(g);
              if (name === DEFAULT_NAMES.male || name === DEFAULT_NAMES.female || name === '') {
                setName(DEFAULT_NAMES[g]);
              }
            }}
            onNext={() => setStep('class')}
          />
        )}

        {step === 'class' && (
          <ClassStep
            selectedClass={selectedClass}
            onSelect={setSelectedClass}
            onBack={() => setStep('identity')}
            onBegin={handleBegin}
            heroName={name}
          />
        )}
      </div>

      {step === 'identity' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="rounded-md border border-card-border bg-card/70 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
            Move: Arrows/WASD &nbsp;·&nbsp; Interact: Space / E
          </div>
        </div>
      )}
    </div>
  );
}
