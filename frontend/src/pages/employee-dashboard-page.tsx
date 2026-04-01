import { Mic, MicOff, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

function StressGauge({ score, active }: { score: number; active: boolean }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color = "#34C78A";
  let label = "You're calm";
  if (score > 66) {
    color = "#F87171";
    label = "High stress detected";
  } else if (score > 33) {
    color = "#F59E0B";
    label = "Feeling tense?";
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          aria-label={`Stress level: ${score} out of 100`}
          role="img"
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#EBEBEB" strokeWidth="16" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: "stroke-dashoffset 600ms ease, stroke 600ms ease" }}
          />
          <text
            x="100"
            y="92"
            textAnchor="middle"
            dy="0.3em"
            fontSize="40"
            fontWeight="700"
            fill="#1A1A1A"
            fontFamily="Nunito, sans-serif"
          >
            {score}
          </text>
          <text
            x="100"
            y="122"
            textAnchor="middle"
            fontSize="13"
            fill="#6B7280"
            fontFamily="Nunito, sans-serif"
          >
            stress score
          </text>
        </svg>
        {active && (
          <span
            aria-label="Recording active"
            className="absolute right-0 top-0 h-4 w-4 rounded-full bg-calm"
            style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
          />
        )}
      </div>
      <p className="mt-3 text-sm font-semibold" style={{ color }}>
        {label}
      </p>
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
            animation: active
              ? `wave 1.2s ease-in-out ${i * 80}ms infinite alternate`
              : "none",
          }}
        />
      ))}
    </div>
  );
}

function MoodBadge({ mood }: { mood: string }) {
  const band = stressBandFromMood(mood);
  if (band === "Low")
    return (
      <span className="inline-flex items-center rounded-full bg-calm-soft px-2.5 py-0.5 text-xs font-semibold text-calm">
        Calm
      </span>
    );
  if (band === "High")
    return (
      <span className="inline-flex items-center rounded-full bg-stressed-soft px-2.5 py-0.5 text-xs font-semibold text-stressed">
        Stressed
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-moderate-soft px-2.5 py-0.5 text-xs font-semibold text-moderate">
      Moderate
    </span>
  );
}

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

  const tokenValue = token ?? "";

  const stressScore = useMemo(
    () =>
      summary.total_count === 0
        ? 0
        : Math.round((1 - Number(summary.avg_sentiment || 0)) * 100),
    [summary],
  );

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
      setStatus(
        `Submitted. Emotion: ${response.feedback.emotionLabel}, Score: ${response.feedback.sentimentScore}`,
      );
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
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
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

  return (
    <DashboardLayout
      role="employee"
      title="Your wellbeing workspace"
      subtitle="A private, guided check-in space for voice and text reflections."
    >
      {/* Top row: gauge + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Stress monitor card */}
        <Card className="flex flex-col items-center py-8">
          <h2 className="mb-6 text-lg font-semibold text-ink">Stress monitor</h2>
          <StressGauge score={stressScore} active={recording} />
          <div className="mt-4 w-full max-w-xs">
            <Waveform active={recording} />
          </div>

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
                Start monitoring
              </Button>
            ) : (
              <Button size="lg" variant="danger" className="rounded-full px-8" onClick={stopRecording}>
                <MicOff aria-hidden="true" className="mr-2 h-5 w-5" />
                Stop monitoring
              </Button>
            )}

            {voiceBlob && !recording && (
              <Button onClick={submitVoice} disabled={voiceUploading}>
                {voiceUploading ? "Saving..." : "Save session"}
              </Button>
            )}
          </div>

          <div className="mt-5 w-full max-w-md rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-muted">
            {voiceText}
          </div>
          {voiceStatus && (
            <p className="mt-2 text-sm font-medium text-calm">{voiceStatus}</p>
          )}
        </Card>

        {/* Sidebar: metric cards + wellness tip */}
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
            <div className="flex-1 min-w-[200px]">
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
          <div role="status" className="mt-4 rounded-xl bg-calm-soft p-3 text-sm text-calm">
            {status}
          </div>
        )}
        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-stressed-soft p-3 text-sm text-stressed">
            {error}
          </div>
        )}
      </Card>

      {/* Reflection history */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Reflection history</h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">📅</div>
            <p className="font-semibold text-ink">No sessions yet</p>
            <p className="mt-1 text-sm text-muted">
              Start monitoring to see your history here.
            </p>
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
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {item.language}
                        {" · "}
                        {item.emotion_label}
                      </p>
                      {item.message && (
                        <p className="mt-0.5 max-w-sm truncate text-xs text-muted">
                          {item.message}
                        </p>
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
    </DashboardLayout>
  );
}
