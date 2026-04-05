import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "inhale" | "hold" | "exhale" | "rest";

interface PhaseConfig {
  phase: Phase;
  label: string;
  instruction: string;
  duration: number;
  color: string;
  targetSize: number;
}

const PHASES: PhaseConfig[] = [
  { phase: "inhale", label: "Breathe in", instruction: "Slowly fill your lungs", duration: 4, color: "#34C78A", targetSize: 148 },
  { phase: "hold",   label: "Hold",       instruction: "Keep still and steady",  duration: 7, color: "#F59E0B", targetSize: 148 },
  { phase: "exhale", label: "Breathe out",instruction: "Release completely",      duration: 8, color: "#6366F1", targetSize: 60  },
  { phase: "rest",   label: "Rest",       instruction: "Prepare for the next breath", duration: 1, color: "#6B7280", targetSize: 60 },
];

interface BreathingExerciseProps {
  onClose: () => void;
}

export function BreathingExercise({ onClose }: BreathingExerciseProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].duration);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const phaseIndexRef = useRef(0);

  const current = PHASES[phaseIndex];

  useEffect(() => {
    phaseIndexRef.current = phaseIndex;
  }, [phaseIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const nextIndex = (phaseIndexRef.current + 1) % PHASES.length;
          if (nextIndex === 0) setCycles((c) => c + 1);
          setPhaseIndex(nextIndex);
          return PHASES[nextIndex].duration;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const handleStart = () => {
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].duration);
    setCycles(0);
    setRunning(true);
  };

  const handlePause = () => setRunning(false);

  const circumference = 2 * Math.PI * 76;
  const progress = 1 - secondsLeft / current.duration;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Guided breathing exercise"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
        {/* Close button */}
        <button
          type="button"
          aria-label="Close breathing exercise"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-canvas"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-ink">Guided Breathing</h2>
        <p className="mt-1 text-sm text-muted">
          4-7-8 technique · Cycle {cycles + 1}
        </p>

        {/* Animated circle */}
        <div className="my-8 flex flex-col items-center">
          <div className="relative flex h-48 w-48 items-center justify-center">
            {/* SVG countdown ring */}
            <svg
              width="192"
              height="192"
              viewBox="0 0 192 192"
              aria-hidden="true"
              className="absolute inset-0"
            >
              <circle cx="96" cy="96" r="76" fill="none" stroke="#EBEBEB" strokeWidth="4" />
              <circle
                cx="96"
                cy="96"
                r="76"
                fill="none"
                stroke={current.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 96 96)"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 600ms ease" }}
              />
            </svg>

            {/* Breathing bubble */}
            <div
              className="absolute rounded-full"
              style={{
                width: `${current.targetSize}px`,
                height: `${current.targetSize}px`,
                backgroundColor: current.color + "20",
                border: `2px solid ${current.color}`,
                transitionProperty: "width, height, background-color, border-color",
                transitionDuration:
                  current.phase === "inhale"
                    ? "4000ms"
                    : current.phase === "exhale"
                    ? "8000ms"
                    : "400ms",
                transitionTimingFunction: "ease-in-out",
              }}
            />

            {/* Countdown number */}
            <div className="relative flex flex-col items-center">
              <span className="text-4xl font-bold text-ink">{secondsLeft}</span>
              <span className="text-xs text-muted">sec</span>
            </div>
          </div>

          {/* Phase label */}
          <p className="mt-2 text-lg font-bold" style={{ color: current.color }}>
            {current.label}
          </p>
          <p className="mt-0.5 text-sm text-muted">{current.instruction}</p>

          {/* Phase dots */}
          <div className="mt-4 flex gap-2">
            {PHASES.map((p, i) => (
              <div
                key={p.phase}
                className="h-1.5 w-8 rounded-full transition-colors duration-300"
                style={{ backgroundColor: i === phaseIndex ? current.color : "#EBEBEB" }}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!running ? (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f52d4]"
            >
              {cycles > 0 ? "Restart" : "Start"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="rounded-xl border border-border bg-canvas px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-[#f0f0ee]"
            >
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface px-6 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-canvas"
          >
            Done
          </button>
        </div>

        {/* Completion feedback */}
        {cycles > 0 && (
          <p className="mt-5 text-sm font-semibold text-calm">
            {cycles} cycle{cycles > 1 ? "s" : ""} complete — great work!
          </p>
        )}
      </div>
    </div>
  );
}
