import { useState, useRef, useEffect } from 'react';
import { Swords, Wand2, Zap, Shield, User, ChevronRight, Flame, Sparkles, Minus, Plus } from 'lucide-react';
import { useGameStore } from '../store';
import { CLASS_LIST, type ClassDef } from '../classData';
import { EQUIPMENT } from '../gameData';
import type { ClassAttributes } from '../types';
import titleBg from '../../assets/title-bg.png';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const CLASS_ICONS: Record<string, React.ReactNode> = {
  warrior: <Swords size={24} />,
  mage:    <Wand2  size={24} />,
  rogue:   <Zap    size={24} />,
  paladin: <Shield size={24} />,
  allrounder: <Sparkles size={24} />,
};

const EMPTY_ALLOCATION: ClassAttributes = { str: 0, dex: 0, int: 0, con: 0 };
const ALLOCATION_STATS: { key: keyof ClassAttributes; label: string; effect: string }[] = [
  { key: 'str', label: 'STR', effect: '+1.2 Attack' },
  { key: 'dex', label: 'DEX', effect: '+0.8% Crit' },
  { key: 'int', label: 'INT', effect: '+8 Max Mana' },
  { key: 'con', label: 'CON', effect: '+8 Max HP, +0.8 DEF' },
];

const DEFAULT_NAMES: Record<string, string> = {
  male:   'Rohit',
  female: 'Khushi',
};
const MAX_HERO_NAME_LENGTH = 15;
const INVALID_HERO_NAME_CHARACTERS = /[^\p{L} '’-]/u;

/* ── Shared backdrop card ──────────────────────────────────────────────────── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`w-full rounded-2xl border border-white/15 p-5 shadow-2xl backdrop-blur-md ${className}`}
      style={{ backgroundColor: 'rgba(8, 10, 18, 0.88)' }}
    >
      {children}
    </div>
  );
}

/* ── Screen 1: Landing ─────────────────────────────────────────────────────── */
function LandingScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        onClick={onBegin}
        className="flex items-center gap-3 rounded-xl border-2 border-primary/80 bg-primary px-10 py-4 font-serif text-lg font-bold uppercase tracking-widest text-black shadow-[0_0_32px_rgba(244,195,86,0.5)] transition-transform hover:scale-105 active:scale-95"
      >
        <Swords size={20} />
        Begin Your Adventure
        <ChevronRight size={20} />
      </button>
      <div className="text-[11px] text-white/40 tracking-wide">
        Move: Arrows / WASD &nbsp;·&nbsp; Interact: Space / E
      </div>
    </div>
  );
}

/* ── Compact class button ──────────────────────────────────────────────────── */
function ClassButton({ cls, selected, onSelect }: { cls: ClassDef; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-[150px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2 text-center transition-all w-full"
      style={
        selected
          ? {
              borderColor: cls.colorPrimary,
              backgroundColor: `${cls.colorPrimary}28`,
              boxShadow: `0 0 22px ${cls.colorGlow}, inset 0 0 20px ${cls.colorPrimary}10`,
            }
          : {
              borderColor: 'rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }
      }
    >
      {/* Icon */}
      <span style={{ color: selected ? cls.colorPrimary : 'rgba(255,255,255,0.6)' }}>
        {CLASS_ICONS[cls.id]}
      </span>

      {/* Class name — large and bold */}
      <span
        className="font-serif text-sm font-bold leading-tight sm:text-base"
        style={{ color: selected ? cls.colorPrimary : '#ffffff' }}
      >
        {cls.name}
      </span>

      {/* HP / MP */}
      <div className="flex gap-2 text-[10px] font-mono font-semibold sm:gap-3 sm:text-xs">
        <span className="text-red-300">HP {cls.baseStats.maxHp}</span>
        <span className="text-blue-300">MP {cls.baseStats.maxMp}</span>
      </div>

      <span className="text-[10px] leading-tight text-white/65">
        {EQUIPMENT[cls.starterWeaponId]?.name ?? 'Starter weapon'}
      </span>
      {cls.id === 'allrounder' && (
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-slate-100">
          5 stat points
        </span>
      )}

      {/* Role pill */}
      <span
        className="rounded-full px-2 py-1 text-[9px] font-semibold leading-tight sm:text-[10px]"
        style={
          selected
            ? { backgroundColor: `${cls.colorPrimary}40`, color: cls.colorPrimary }
            : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }
        }
      >
        {cls.role.split(/[,·&]/)[0]?.trim()}
      </span>
    </button>
  );
}

/* ── Skills panel ──────────────────────────────────────────────────────────── */
function SkillsPanel({ cls }: { cls: ClassDef }) {
  return (
    <div
      className="w-full rounded-xl border-2 p-4 mt-1"
      style={{
        borderColor: cls.colorPrimary,
        backgroundColor: 'rgba(6, 8, 18, 0.92)',
      }}
    >
      {/* Description */}
      <p className="text-sm text-white/75 mb-4 leading-relaxed">
        {cls.description}
      </p>
      {cls.id === 'allrounder' && (
        <div className="mb-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-100">
          <div className="font-semibold">
            Base attributes: STR 11 · DEX 11 · INT 11 · CON 11
          </div>
          <div className="mt-1 text-white/65">
            ATK 11 · DEF 8 · MATK 11 · MDEF 8 · SPD 11 · LUK 11
          </div>
          <div className="mt-1 text-white/65">
            Starter weapon: {EQUIPMENT[cls.starterWeaponId]?.name ?? 'Sword'}
          </div>
        </div>
      )}

      {/* Abilities heading */}
      <div
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: cls.colorPrimary }}
      >
        Class Skills
      </div>

      <div className="flex flex-col gap-2">
        {cls.abilities.map((ab) => (
          <div
            key={ab.name}
            className="flex flex-col gap-1 rounded-lg border px-3 py-2.5"
            style={{
              borderColor: `${cls.colorPrimary}50`,
              backgroundColor: `${cls.colorPrimary}12`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{ab.name}</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                {ab.unlockLevel === 1 ? 'Starting' : `Level ${ab.unlockLevel}`}
              </span>
              <span
                className="rounded px-2 py-0.5 text-[11px] font-bold font-mono"
                style={{ backgroundColor: `${cls.colorPrimary}40`, color: cls.colorPrimary }}
              >
                {ab.cost}
              </span>
            </div>
            <span className="text-sm text-white/70 leading-snug">{ab.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 2: Class selection ─────────────────────────────────────────────── */
function AllrounderPointAllocation({
  allocatedStats,
  onChange,
}: {
  allocatedStats: ClassAttributes;
  onChange: (next: ClassAttributes) => void;
}) {
  const spent = Object.values(allocatedStats).reduce((sum, value) => sum + value, 0);
  const remaining = Math.max(0, 5 - spent);
  const hp = 100 + allocatedStats.con * 8;
  const mp = 60 + allocatedStats.int * 8;
  const attack = 11 + allocatedStats.str * 1.2;
  const defense = 8 + allocatedStats.con * 0.8;
  const crit = 5 + Math.min(25, (11 + allocatedStats.dex * 0.8));

  function adjust(stat: keyof ClassAttributes, delta: number) {
    const nextValue = allocatedStats[stat] + delta;
    if (nextValue < 0 || (delta > 0 && remaining === 0)) return;
    onChange({ ...allocatedStats, [stat]: nextValue });
  }

  return (
    <section className="rounded-xl border border-slate-200/60 bg-slate-100/10 p-3 text-white sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-serif text-sm font-bold text-slate-100">Distribute Creation Points</h3>
          <p className="text-[11px] text-white/65">All 5 points must be spent before continuing.</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200/40 bg-slate-100/10 px-2.5 py-1 text-xs font-bold text-white">
          {remaining} left
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {ALLOCATION_STATS.map(({ key, label, effect }) => (
          <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">
                {label} <span className="font-normal text-white/65">{11 + allocatedStats[key]} total</span>
              </div>
              <div className="text-[10px] text-white/55">{effect}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label={`Remove one ${label} point`}
                disabled={allocatedStats[key] === 0}
                onClick={() => adjust(key, -1)}
                className="rounded-md border border-white/20 p-1 text-white hover:bg-white/10 disabled:opacity-30"
              >
                <Minus size={13} />
              </button>
              <span className="w-4 text-center font-mono text-xs">{allocatedStats[key]}</span>
              <button
                type="button"
                aria-label={`Add one ${label} point`}
                disabled={remaining === 0}
                onClick={() => adjust(key, 1)}
                className="rounded-md border border-white/20 p-1 text-white hover:bg-white/10 disabled:opacity-30"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
        <div className="rounded-md bg-black/25 px-2 py-1.5">Preview HP: <b>{hp}</b></div>
        <div className="rounded-md bg-black/25 px-2 py-1.5">Preview MP: <b>{mp}</b></div>
        <div className="rounded-md bg-black/25 px-2 py-1.5">Preview ATK: <b>{attack.toFixed(1)}</b></div>
        <div className="rounded-md bg-black/25 px-2 py-1.5">Preview DEF: <b>{defense.toFixed(1)}</b> · Crit {crit.toFixed(1)}%</div>
      </div>
    </section>
  );
}

function ClassScreen({
  selectedClass,
  allocatedStats,
  onSelect,
  onAllocationChange,
  onNext,
  onBack,
}: {
  selectedClass: string | null;
  allocatedStats: ClassAttributes;
  onSelect: (id: string) => void;
  onAllocationChange: (next: ClassAttributes) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const cls = selectedClass ? CLASS_LIST.find((c) => c.id === selectedClass) ?? null : null;
  const allocationSpent = Object.values(allocatedStats).reduce((sum, value) => sum + value, 0);
  const canContinue = !!selectedClass && (selectedClass !== 'allrounder' || allocationSpent === 5);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-3">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-white drop-shadow-lg tracking-wide">
          Choose Your Class
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Click a class to see its abilities.
        </p>
      </div>

      {/* Keep all five class cards in one row; narrow screens can scroll the row. */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="grid min-w-[680px] grid-cols-5 gap-2">
          {CLASS_LIST.map((c) => (
            <ClassButton
              key={c.id}
              cls={c}
              selected={selectedClass === c.id}
              onSelect={() => onSelect(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Skills panel — only when a class is selected */}
      {cls && <SkillsPanel cls={cls} />}
      {selectedClass === 'allrounder' && (
        <AllrounderPointAllocation
          allocatedStats={allocatedStats}
          onChange={onAllocationChange}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-primary/80 bg-primary px-6 py-3 font-serif text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_24px_rgba(244,195,86,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Swords size={16} />
          {!cls
            ? 'Select a Class'
            : selectedClass === 'allrounder' && allocationSpent < 5
              ? `Spend ${5 - allocationSpent} Point${5 - allocationSpent === 1 ? '' : 's'} to Continue`
              : `Continue as ${cls.name}`}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Screen 3: Gender + Name ───────────────────────────────────────────────── */
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
  const trimmedName = name.trim();
  const hasInvalidCharacters = INVALID_HERO_NAME_CHARACTERS.test(name);
  const exceedsMaxLength = name.length > MAX_HERO_NAME_LENGTH;
  const nameError = hasInvalidCharacters
    ? 'Name contains invalid characters'
    : exceedsMaxLength
      ? `Name cannot exceed ${MAX_HERO_NAME_LENGTH} characters`
      : !trimmedName
        ? 'Name cannot be empty'
        : null;
  const canStart = !nameError;

  return (
    <Card className="max-w-xs">
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="font-serif text-xl font-bold text-white">Who Are You?</h2>
        {cls && (
          <p className="mt-1 text-sm text-white/55">
            Your{' '}
            <span style={{ color: cls.colorPrimary }} className="font-bold">
              {cls.name}
            </span>{' '}
            needs a name.
          </p>
        )}
      </div>

      {/* Gender */}
      <div className="flex flex-col gap-2 mb-4">
        <label className="text-xs font-bold uppercase tracking-widest text-white/50">
          Gender
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                onGender(g);
                if (name === DEFAULT_NAMES.male || name === DEFAULT_NAMES.female || name === '') {
                  onName(DEFAULT_NAMES[g]);
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-bold transition-all ${
                gender === g
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <User size={14} />
              {g === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2 mb-5">
        <label htmlFor="hero-name" className="text-xs font-bold uppercase tracking-widest text-white/50">
          Hero Name
        </label>
        <div className="flex items-center gap-2">
          <input
            id="hero-name"
            ref={inputRef}
            type="text"
            value={name}
            maxLength={MAX_HERO_NAME_LENGTH}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'hero-name-error' : undefined}
            onChange={(e) => onName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canStart) onStart(); }}
            className={`min-w-0 flex-1 rounded-lg border bg-white/8 px-3 py-2.5 text-sm font-semibold text-white placeholder-white/30 outline-none focus:ring-1 ${
              nameError
                ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400/30'
                : 'border-white/20 focus:border-primary focus:ring-primary/30'
            }`}
            placeholder="Enter your name…"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          />
          <button
            type="button"
            onClick={() => onName(DEFAULT_NAMES[gender])}
            className="shrink-0 rounded-lg border border-white/20 px-2 py-2.5 text-[10px] font-semibold text-white/75 transition-colors hover:border-primary/60 hover:bg-white/10 hover:text-white"
          >
            Reset to default
          </button>
        </div>
        {nameError && (
          <p id="hero-name-error" role="alert" className="text-xs text-red-300">
            {nameError}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary/80 bg-primary px-4 py-3 font-serif text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(244,195,86,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          Begin Adventure as {trimmedName || '…'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-center text-xs text-white/40 hover:text-white/70 transition-colors underline-offset-2 hover:underline"
        >
          ← Back to class selection
        </button>
      </div>
    </Card>
  );
}

/* ── Main TitleScreen ──────────────────────────────────────────────────────── */
export function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);

  const [step, setStep] = useState<'landing' | 'class' | 'gender'>('landing');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [name, setName] = useState(DEFAULT_NAMES.male);
  const [allocatedStats, setAllocatedStats] = useState<ClassAttributes>({ ...EMPTY_ALLOCATION });

  function handleStart() {
    const trimmedName = name.trim();
    if (
      !trimmedName
      || name.length > MAX_HERO_NAME_LENGTH
      || INVALID_HERO_NAME_CHARACTERS.test(name)
      || !selectedClass
    ) return;
    startNewGame(
      trimmedName,
      gender,
      selectedClass,
      selectedClass === 'allrounder' ? allocatedStats : undefined,
    );
  }

  function handleClassSelect(id: string) {
    if (id !== selectedClass) setAllocatedStats({ ...EMPTY_ALLOCATION });
    setSelectedClass(id);
  }

  function handleGenderChange(g: 'male' | 'female') {
    setGender(g);
    if (name === DEFAULT_NAMES.male || name === DEFAULT_NAMES.female || name === '') {
      setName(DEFAULT_NAMES[g]);
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background px-4">
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
            'linear-gradient(to bottom, rgba(6,8,18,0.45) 0%, rgba(6,8,18,0.15) 30%, rgba(6,8,18,0.65) 65%, rgba(6,8,18,0.97) 85%, rgba(6,8,18,1) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(circle at 50% 22%, rgba(100,200,255,0.14), transparent 55%)',
        }}
      />

      {/* Title + tagline — always visible */}
      {step === 'landing' && (
        <div className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-yellow-400/70">
            <Flame size={13} />
            <span className="font-serif text-xs uppercase tracking-[0.4em]">Ancient Echoes</span>
            <Flame size={13} />
          </div>
          <p className="text-white/40 text-sm mt-1">Enter the dungeon. Claim the glory.</p>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center gap-4">
        {step === 'landing' && <LandingScreen onBegin={() => setStep('class')} />}

        {step === 'class' && (
          <ClassScreen
            selectedClass={selectedClass}
            allocatedStats={allocatedStats}
            onSelect={handleClassSelect}
            onAllocationChange={setAllocatedStats}
            onNext={() => setStep('gender')}
            onBack={() => setStep('landing')}
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
    </div>
  );
}
