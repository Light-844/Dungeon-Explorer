import { useState, useRef, useEffect } from 'react';
import { Swords, Wand2, Zap, Shield, User, ChevronRight, Flame } from 'lucide-react';
import { useGameStore } from '../store';
import { CLASS_LIST, type ClassDef } from '../classData';
import titleBg from '../../assets/title-bg.png';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const CLASS_ICONS: Record<string, React.ReactNode> = {
  warrior: <Swords size={24} />,
  mage:    <Wand2  size={24} />,
  rogue:   <Zap    size={24} />,
  paladin: <Shield size={24} />,
};

const DEFAULT_NAMES: Record<string, string> = {
  male:   'Rohit',
  female: 'Khushi',
};

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
      className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all w-full"
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
        className="font-serif text-base font-bold leading-tight"
        style={{ color: selected ? cls.colorPrimary : '#ffffff' }}
      >
        {cls.name}
      </span>

      {/* HP / MP */}
      <div className="flex gap-3 text-xs font-mono font-semibold">
        <span className="text-red-300">HP {cls.baseStats.maxHp}</span>
        <span className="text-blue-300">MP {cls.baseStats.maxMp}</span>
      </div>

      {/* Role pill */}
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight"
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

      {/* Abilities heading */}
      <div
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: cls.colorPrimary }}
      >
        Starting Abilities
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
function ClassScreen({
  selectedClass,
  onSelect,
  onNext,
  onBack,
}: {
  selectedClass: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const cls = selectedClass ? CLASS_LIST.find((c) => c.id === selectedClass) ?? null : null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-white drop-shadow-lg tracking-wide">
          Choose Your Class
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Click a class to see its abilities.
        </p>
      </div>

      {/* Class row — 4 equal boxes */}
      <div className="grid grid-cols-4 gap-3">
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
          disabled={!selectedClass}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-primary/80 bg-primary px-6 py-3 font-serif text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_24px_rgba(244,195,86,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Swords size={16} />
          {cls ? `Continue as ${cls.name}` : 'Select a Class'}
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
        <input
          id="hero-name"
          ref={inputRef}
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onStart(); }}
          className="rounded-lg border border-white/20 bg-white/8 px-3 py-2.5 text-sm font-semibold text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          placeholder="Enter your name…"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!name.trim()}
          onClick={onStart}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary/80 bg-primary px-4 py-3 font-serif text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(244,195,86,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          Enter the Dungeon
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
            onSelect={setSelectedClass}
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
