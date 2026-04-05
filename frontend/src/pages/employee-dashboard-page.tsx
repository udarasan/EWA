import { Camera, CameraOff, Mic, MicOff, RefreshCw, Send, TrendingDown, TrendingUp, Wind } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BreathingExercise } from "../components/employee/breathing-exercise";
import { FaceStressScanner } from "../components/employee/face-stress-scanner";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../context/auth-context";
import { feedbackApi } from "../lib/api/feedback";
import { stressBandFromMood } from "../lib/format";
import type { FeedbackItem, FeedbackSummary } from "../lib/api/types";

const voiceMap: Record<string, string> = {
  English: "en-US",
  Sinhala: "si-LK",
  Tamil: "ta-IN",
};

const wellnessTips = [
  { emoji: "🧘", text: "Take 3 deep breaths. Inhale for 4 counts, hold for 4, exhale for 6." },
  { emoji: "💧", text: "Hydration helps focus. Have you had a glass of water in the last hour?" },
  { emoji: "🚶", text: "A 5-minute walk can reset your stress response. Step away from your screen." },
  { emoji: "🌿", text: "Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s." },
  { emoji: "☀️", text: "Sunlight boosts serotonin. Even 10 minutes outside can shift your mood." },
  { emoji: "🎵", text: "Calm music at 60 BPM can synchronize your heart rate and reduce anxiety." },
];

type ScanMode = "voice" | "face" | "combined";
const CONSENT_KEY = "faceStress_consentGiven";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStreak(items: FeedbackItem[]): number {
  if (items.length === 0) return 0;
  const days = new Set(items.map((i) => new Date(i.created_at).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}

function buildTrendData(items: FeedbackItem[]) {
  const map = new Map<string, number[]>();
  items.forEach((item) => {
    const key = new Date(item.created_at).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });
    const score = Math.round((1 - Number(item.sentiment_score || 0)) * 100);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(score);
  });
  return [...map.entries()]
    .map(([day, scores]) => ({
      day,
      stress: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .slice(-14);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StressGauge({ score, active, mode }: { score: number; active: boolean; mode: ScanMode }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color = "#34C78A";
  let label = "You're calm";
  if (score > 66) { color = "#F87171"; label = "High stress detected"; }
  else if (score > 33) { color = "#F59E0B"; label = "Feeling tense?"; }

  const modeLabel = mode === "face" ? "Live · Face scan" : mode === "combined" ? "Live · Voice + Face" : "Avg · Voice";

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200" aria-label={`Stress level: ${score} out of 100`} role="img">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#EBEBEB" strokeWidth="16" />
          <circle
            cx="100" cy="100" r={radius}
            fill="none" stroke={color} strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: "stroke-dashoffset 600ms ease, stroke 600ms ease" }}
          />
          <text x="100" y="88" textAnchor="middle" fontSize="40" fontWeight="700" fill="#1A1A1A" fontFamily="Nunito, sans-serif">{score}</text>
          <text x="100" y="112" textAnchor="middle" fontSize="12" fill="#6B7280" fontFamily="Nunito, sans-serif">stress score</text>
          <text x="100" y="130" textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="Nunito, sans-serif">{modeLabel}</text>
        </svg>
        {active && (
          <span
            aria-label="Scan active"
            className="absolute right-0 top-0 h-4 w-4 rounded-full bg-calm"
            style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
          />
        )}
      </div>
      <p className="mt-3 text-sm font-semibold" style={{ color }}>{label}</p>
    </div>
  );
}

const WAVEFORM_HEIGHTS = [3, 5, 8, 12, 9, 7, 10, 6, 4, 8, 11, 7, 5, 9, 6];

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 items-center justify-center gap-1" aria-hidden="true">
      {WAVEFORM_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full"
          style={{
            height: active ? `${h * 2.4}px` : "4px",
            backgroundColor: active ? "#34C78A" : "#EBEBEB",
            transition: `height 300ms ease ${i * 30}ms`,
            animation: active ? `wave 1.2s ease-in-out ${i * 80}ms infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

function MoodBadge({ mood }: { mood: string }) {
  const band = stressBandFromMood(mood);
  if (band === "Low") return <span className="inline-flex items-center rounded-full bg-calm-soft px-2.5 py-0.5 text-xs font-semibold text-calm">Calm</span>;
  if (band === "High") return <span className="inline-flex items-center rounded-full bg-stressed-soft px-2.5 py-0.5 text-xs font-semibold text-stressed">Stressed</span>;
  return <span className="inline-flex items-center rounded-full bg-moderate-soft px-2.5 py-0.5 text-xs font-semibold text-moderate">Moderate</span>;
}

/** Camera consent modal — shown once before enabling face mode */
function CameraConsentModal({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDecline(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDecline]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Camera access consent"
      onClick={(e) => { if (e.target === e.currentTarget) onDecline(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_8px_40px_rgba(0,0,0,0.18)]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <Camera aria-hidden="true" className="h-7 w-7 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-ink">Enable face stress detection?</h2>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          This feature uses your camera to analyse facial expressions and estimate your stress level in real time.
        </p>
        <ul className="mt-4 space-y-2">
          {[
            { icon: "🔒", text: "All analysis runs locally in your browser — no video is ever uploaded." },
            { icon: "🚫", text: "No images or video are stored anywhere." },
            { icon: "⚡", text: "You can stop the scan at any time." },
          ].map((item) => (
            <li key={item.text} className="flex items-start gap-2 text-sm text-ink">
              <span aria-hidden="true" className="mt-0.5 shrink-0">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f52d4]"
          >
            Allow camera
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-canvas"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EmployeeDashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    total_count: 0,
    avg_sentiment: 0,
    positive_count: 0,
    negative_count: 0,
  });
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("English");
  const [audio, setAudio] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("English");
  const [voiceText, setVoiceText] = useState("Your live transcript will appear here...");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptFinalRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * wellnessTips.length));
  const [showBreathing, setShowBreathing] = useState(false);

  // Face scan state
  const [scanMode, setScanMode] = useState<ScanMode>("voice");
  const [faceActive, setFaceActive] = useState(false);
  const [faceScore, setFaceScore] = useState<number | null>(null);
  const [consentGiven, setConsentGiven] = useState<boolean>(
    () => localStorage.getItem(CONSENT_KEY) === "true",
  );
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<ScanMode | null>(null);

  const tokenValue = token ?? "";

  const historicalStressScore = useMemo(
    () => summary.total_count === 0 ? 0 : Math.round((1 - Number(summary.avg_sentiment || 0)) * 100),
    [summary],
  );

  /** Score shown on the gauge depends on scan mode */
  const displayScore = useMemo(() => {
    if ((scanMode === "face") && faceScore !== null) return faceScore;
    if (scanMode === "combined" && faceScore !== null) {
      return Math.round(historicalStressScore * 0.5 + faceScore * 0.5);
    }
    return historicalStressScore;
  }, [scanMode, faceScore, historicalStressScore]);

  const isAnyActive = recording || faceActive;

  const streak = useMemo(() => getStreak(items), [items]);
  const trendData = useMemo(() => buildTrendData(items), [items]);

  const trendStats = useMemo(() => {
    const recent = trendData.slice(-7);
    if (recent.length === 0) return null;
    const avg7 = Math.round(recent.reduce((s, d) => s + d.stress, 0) / recent.length);
    const bestDay = recent.reduce((min, d) => (d.stress < min.stress ? d : min), recent[0]);
    const isImproving = recent.length >= 2 && recent[recent.length - 1].stress < recent[0].stress;
    return { avg7, bestDay: bestDay.day, isImproving };
  }, [trendData]);

  const refresh = async () => {
    if (!tokenValue) return;
    const [feedbackData, summaryData] = await Promise.all([
      feedbackApi.listMine(tokenValue),
      feedbackApi.summary(tokenValue),
    ]);
    setItems(feedbackData.feedback);
    setSummary(summaryData.summary);
  };

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load data."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenValue]);

  // ── Mode switching ────────────────────────────────────────────────────────

  const applyMode = useCallback((mode: ScanMode) => {
    setScanMode(mode);
    // Stop face scan if switching away from face/combined
    if (mode === "voice") {
      setFaceActive(false);
      setFaceScore(null);
    }
  }, []);

  const handleModeSelect = useCallback(
    (mode: ScanMode) => {
      if (mode === scanMode) return;
      if (mode !== "voice" && !consentGiven) {
        setPendingMode(mode);
        setShowConsentModal(true);
        return;
      }
      applyMode(mode);
    },
    [scanMode, consentGiven, applyMode],
  );

  const handleConsentAccept = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    setConsentGiven(true);
    setShowConsentModal(false);
    if (pendingMode) applyMode(pendingMode);
    setPendingMode(null);
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
    setPendingMode(null);
  };

  const handleFaceUpdate = useCallback((score: number) => {
    setFaceScore(score);
  }, []);

  // ── Voice recording ───────────────────────────────────────────────────────

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setError("");
    try {
      const formData = new FormData();
      formData.append("message", message.trim());
      formData.append("language", language);
      if (audio) formData.append("audio", audio);
      const response = await feedbackApi.submit(tokenValue, formData);
      setStatus(`Submitted. Emotion: ${response.feedback.emotionLabel}, Score: ${response.feedback.sentimentScore}`);
      setMessage("");
      setLanguage("English");
      setAudio(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback.");
    }
  };

  const startRecording = async () => {
    setVoiceStatus("");
    setVoiceBlob(null);
    transcriptFinalRef.current = "";
    chunksRef.current = [];
    setVoiceText("Listening...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setVoiceBlob(blob);
        setVoiceStatus("Recording ready — save your session below.");
      };
      recorder.start(400);
      mediaRecorderRef.current = recorder;

      const SpeechRecognitionCtor: SpeechRecognitionConstructor | undefined =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = voiceMap[voiceLanguage] ?? "en-US";
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = "";
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const value = event.results[index][0].transcript;
            if (event.results[index].isFinal) transcriptFinalRef.current += value;
            else interim += value;
          }
          setVoiceText((transcriptFinalRef.current + interim).trim() || "...");
        };
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setVoiceText("Live captions not supported. Audio will be transcribed server-side.");
      }
      setRecording(true);
    } catch {
      setVoiceStatus("Microphone permission denied or unavailable.");
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecording(false);
  };

  const submitVoice = async () => {
    if (!voiceBlob) return;
    setVoiceUploading(true);
    setVoiceStatus("Uploading...");
    try {
      const formData = new FormData();
      formData.append("audio", voiceBlob, "voice.webm");
      formData.append("language", voiceLanguage);
      formData.append("transcript", transcriptFinalRef.current.trim());
      const response = await feedbackApi.submitVoice(tokenValue, formData);
      setVoiceStatus(`Saved. Stress: ${response.feedback.mood}, mood ${response.feedback.emotionLabel}.`);
      setVoiceBlob(null);
      setVoiceText("Your live transcript will appear here...");
      transcriptFinalRef.current = "";
      await refresh();
    } catch (err) {
      setVoiceStatus(err instanceof Error ? err.message : "Failed to save voice check-in.");
    } finally {
      setVoiceUploading(false);
    }
  };

  useEffect(
    () => () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
    },
    [],
  );

  const tip = wellnessTips[tipIndex];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      role="employee"
      title="Your wellbeing workspace"
      subtitle="A private, guided check-in space for voice, face, and text reflections."
    >
      {/* Modals */}
      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
      {showConsentModal && (
        <CameraConsentModal onAccept={handleConsentAccept} onDecline={handleConsentDecline} />
      )}

      {/* High-stress alert banner */}
      {displayScore > 66 && (historicalStressScore > 0 || faceScore !== null) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stressed/20 bg-stressed-soft px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-stressed">High stress detected</p>
              <p className="text-xs text-stressed/80">A short breathing exercise can help lower your stress response.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBreathing(true)}
            className="flex items-center gap-1.5 rounded-xl bg-stressed px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e05555]"
          >
            <Wind aria-hidden="true" className="h-4 w-4" />
            Try breathing exercise
          </button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-canvas p-1" role="group" aria-label="Monitoring mode">
        {(
          [
            { value: "voice" as ScanMode, icon: <Mic className="h-4 w-4" />, label: "Voice" },
            { value: "face" as ScanMode, icon: <Camera className="h-4 w-4" />, label: "Face" },
            { value: "combined" as ScanMode, icon: <><Mic className="h-3.5 w-3.5" /><span className="text-[10px]">+</span><Camera className="h-3.5 w-3.5" /></>, label: "Combined" },
          ] as const
        ).map(({ value, icon, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={scanMode === value}
            onClick={() => handleModeSelect(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              scanMode === value
                ? "bg-surface text-accent shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <span aria-hidden="true" className="flex items-center gap-0.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Top row: gauge + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Stress monitor card */}
        <Card className="flex flex-col items-center py-8">
          <h2 className="mb-6 text-lg font-semibold text-ink">Stress monitor</h2>
          <StressGauge score={displayScore} active={isAnyActive} mode={scanMode} />

          {/* Voice waveform — shown in voice + combined modes */}
          {scanMode !== "face" && (
            <div className="mt-4 w-full max-w-xs">
              <Waveform active={recording} />
            </div>
          )}

          {/* Voice controls */}
          {(scanMode === "voice" || scanMode === "combined") && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Select
                className="w-36"
                value={voiceLanguage}
                onChange={(event) => setVoiceLanguage(event.target.value)}
                aria-label="Voice language"
              >
                <option>English</option>
                <option>Sinhala</option>
                <option>Tamil</option>
              </Select>

              {!recording ? (
                <Button size="lg" variant="success" className="rounded-full px-8" onClick={startRecording}>
                  <Mic aria-hidden="true" className="mr-2 h-5 w-5" />
                  Start voice
                </Button>
              ) : (
                <Button size="lg" variant="danger" className="rounded-full px-8" onClick={stopRecording}>
                  <MicOff aria-hidden="true" className="mr-2 h-5 w-5" />
                  Stop voice
                </Button>
              )}

              {voiceBlob && !recording && (
                <Button onClick={submitVoice} disabled={voiceUploading}>
                  {voiceUploading ? "Saving..." : "Save session"}
                </Button>
              )}
            </div>
          )}

          {/* Voice transcript */}
          {(scanMode === "voice" || scanMode === "combined") && (
            <div className="mt-5 w-full max-w-md rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-muted">
              {voiceText}
            </div>
          )}
          {voiceStatus && <p className="mt-2 text-sm font-medium text-calm">{voiceStatus}</p>}

          {/* Face camera preview + controls */}
          {(scanMode === "face" || scanMode === "combined") && (
            <div className="mt-5 w-full max-w-md space-y-3">
              <FaceStressScanner active={faceActive} onStressUpdate={handleFaceUpdate} />
              <div className="flex justify-center gap-3">
                {!faceActive ? (
                  <Button size="lg" variant="success" className="rounded-full px-8" onClick={() => setFaceActive(true)}>
                    <Camera aria-hidden="true" className="mr-2 h-5 w-5" />
                    Start face scan
                  </Button>
                ) : (
                  <Button size="lg" variant="danger" className="rounded-full px-8" onClick={() => { setFaceActive(false); setFaceScore(null); }}>
                    <CameraOff aria-hidden="true" className="mr-2 h-5 w-5" />
                    Stop face scan
                  </Button>
                )}
              </div>
              {faceActive && faceScore !== null && (
                <p className="text-center text-xs text-muted">
                  Live face stress: <span className="font-semibold text-ink">{faceScore}</span> · Processed locally in your browser
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Sidebar: metric cards + streak + wellness tip */}
        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total check-ins</p>
            <p className="mt-1 text-3xl font-bold text-ink">{summary.total_count}</p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Avg sentiment</p>
            <p className="mt-1 text-3xl font-bold text-ink">
              {Number(summary.avg_sentiment || 0).toFixed(2)}
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Positive</p>
              <p className="mt-1 text-2xl font-bold text-calm">{summary.positive_count}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Negative</p>
              <p className="mt-1 text-2xl font-bold text-stressed">{summary.negative_count}</p>
            </Card>
          </div>

          {/* Check-in streak */}
          <Card className="border-accent/20 bg-accent-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Check-in streak</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span aria-hidden="true" className="text-2xl">🔥</span>
              <p className="text-3xl font-bold text-ink">{streak}</p>
              <p className="text-sm text-muted">day{streak !== 1 ? "s" : ""}</p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {streak === 0 ? "Start your first check-in today!" : streak === 1 ? "Great start — keep going tomorrow!" : `${streak} days in a row — keep it up!`}
            </p>
          </Card>

          {/* Wellness tip */}
          <Card className="border-calm/20 bg-calm-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-calm">Wellness tip</p>
                <p className="mt-2 text-sm text-ink">
                  <span className="mr-1" aria-hidden="true">{tip.emoji}</span>
                  {tip.text}
                </p>
              </div>
              <button
                type="button"
                aria-label="Get a new wellness tip"
                className="mt-0.5 shrink-0 rounded-lg p-1.5 text-calm transition-colors hover:bg-calm/20"
                onClick={() => setTipIndex((i) => (i + 1) % wellnessTips.length)}
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </Card>

          {/* Breathing exercise shortcut */}
          <button
            type="button"
            onClick={() => setShowBreathing(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition-all hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
          >
            <Wind aria-hidden="true" className="h-4 w-4" />
            Open breathing exercise
          </button>
        </div>
      </div>

      {/* Written check-in */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Quick written check-in</h2>
        <p className="mt-1 text-sm text-muted">Share how work has felt lately in text.</p>
        <form className="mt-4 space-y-4" onSubmit={submitFeedback}>
          <Textarea
            required
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="How has work felt lately?"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="mb-1.5 block text-xs font-medium text-muted">Language</label>
              <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option>English</option>
                <option>Sinhala</option>
                <option>Tamil</option>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Audio attachment (optional)
              </label>
              <Input
                type="file"
                accept="audio/*"
                onChange={(event) => setAudio(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit">
              <Send aria-hidden="true" className="mr-2 h-4 w-4" />
              Submit feedback
            </Button>
          </div>
        </form>
        {status && (
          <div role="status" className="mt-4 rounded-xl bg-calm-soft p-3 text-sm text-calm">{status}</div>
        )}
        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-stressed-soft p-3 text-sm text-stressed">{error}</div>
        )}
      </Card>

      {/* Reflection history */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Reflection history</h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">📅</div>
            <p className="font-semibold text-ink">No sessions yet</p>
            <p className="mt-1 text-sm text-muted">Start monitoring to see your history here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const scoreVal = Math.round((1 - Number(item.sentiment_score || 0)) * 100);
              let barColor = "#34C78A";
              if (scoreVal > 66) barColor = "#F87171";
              else if (scoreVal > 33) barColor = "#F59E0B";
              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-canvas transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
                >
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleTimeString(undefined, {
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {" · "}{item.language}{" · "}{item.emotion_label}
                      </p>
                      {item.message && (
                        <p className="mt-0.5 max-w-sm truncate text-xs text-muted">{item.message}</p>
                      )}
                    </div>
                    <MoodBadge mood={item.mood} />
                  </div>
                  <div className="h-1 w-full bg-border">
                    <div
                      className="h-1 transition-all duration-500"
                      style={{ width: `${scoreVal}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Personal stress trends */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Your stress trends</h2>
            <p className="mt-1 text-sm text-muted">Daily average stress over your last 14 sessions</p>
          </div>
          {trendStats && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted">7-day avg</p>
                <p className="font-bold text-ink">{trendStats.avg7}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted">Best day</p>
                <p className="font-bold text-calm">{trendStats.bestDay}</p>
              </div>
              <div className="flex items-center gap-1">
                {trendStats.isImproving ? (
                  <>
                    <TrendingDown aria-hidden="true" className="h-4 w-4 text-calm" />
                    <span className="text-xs font-semibold text-calm">Improving</span>
                  </>
                ) : (
                  <>
                    <TrendingUp aria-hidden="true" className="h-4 w-4 text-stressed" />
                    <span className="text-xs font-semibold text-stressed">Rising</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {trendData.length < 2 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">📈</div>
            <p className="font-semibold text-ink">Not enough data yet</p>
            <p className="mt-1 text-sm text-muted">
              Complete check-ins on at least 2 different days to see your trend chart.
            </p>
          </div>
        ) : (
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} />
                <Tooltip
                  formatter={(value) => [`${value}`, "Stress score"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #EBEBEB", fontSize: "13px" }}
                />
                <ReferenceLine
                  y={50}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: "Moderate threshold", position: "insideTopRight", fontSize: 11, fill: "#F59E0B" }}
                />
                <Area
                  type="monotone"
                  dataKey="stress"
                  stroke="#6366F1"
                  fill="rgba(99,102,241,0.10)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#6366F1" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
