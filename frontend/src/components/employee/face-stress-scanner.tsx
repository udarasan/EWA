/**
 * FaceStressScanner
 *
 * Browser-only face stress detection using face-api.js (TensorFlow.js).
 * All inference runs locally — NO video frames are ever sent to the server.
 *
 * Models loaded from /public/models/ (tiny_face_detector + face_expression).
 * Emits a stress score 0–100 via onStressUpdate every ~1s when active.
 */

import * as faceapi from "face-api.js";
import { Camera, CameraOff, Loader } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Expression → stress weight map ──────────────────────────────────────────
// All weights sum to a raw 0–1 value, then scaled to 0–100.
const EXPRESSION_WEIGHTS: Record<string, number> = {
  angry:     1.00,
  fearful:   0.90,
  disgusted: 0.70,
  sad:       0.60,
  surprised: 0.25,
  neutral:   0.10,
  happy:     0.00,
};

function expressionsToStress(expressions: faceapi.FaceExpressions): number {
  const raw = Object.entries(EXPRESSION_WEIGHTS).reduce(
    (sum, [emotion, weight]) => sum + ((expressions as unknown as Record<string, number>)[emotion] ?? 0) * weight,
    0,
  );
  // raw is 0–1 in theory but can exceed 0.8; scale to 0–100 and clamp
  return Math.min(100, Math.round(raw * 130));
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface FaceStressScannerProps {
  active: boolean;
  onStressUpdate: (score: number) => void;
  onStatusChange?: (status: ModelStatus) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function FaceStressScanner({
  active,
  onStressUpdate,
  onStatusChange,
}: FaceStressScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScoreRef = useRef<number | null>(null);

  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const updateStatus = useCallback(
    (s: ModelStatus) => {
      setModelStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  // ── Load models once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (modelStatus !== "idle") return;
    updateStatus("loading");

    const MODEL_URL = "/models";
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => updateStatus("ready"))
      .catch((err) => {
        console.error("[FaceStressScanner] model load failed:", err);
        updateStatus("error");
      });
  }, [modelStatus, updateStatus]);

  // ── Start / stop camera when active prop changes ──────────────────────────
  useEffect(() => {
    if (!active || modelStatus !== "ready") return;

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => null);
        }
        setCameraError("");
        startDetectionLoop();
      } catch (err) {
        setCameraError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access and try again."
            : "Could not open camera. Make sure no other app is using it.",
        );
      }
    }

    function startDetectionLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      async function detect() {
        if (!videoRef.current || !canvasRef.current || cancelled) return;

        const result = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 }),
          )
          .withFaceExpressions()
          .run()
          .catch(() => null);

        if (result) {
          setFaceDetected(true);
          const score = expressionsToStress(result.expressions);
          // Smooth with exponential moving average to avoid jitter
          const prev = lastScoreRef.current;
          const smoothed = prev === null ? score : Math.round(prev * 0.6 + score * 0.4);
          lastScoreRef.current = smoothed;
          onStressUpdate(smoothed);

          // Draw bounding box overlay
          const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
          const resized = faceapi.resizeResults(result, dims);
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            const box = resized.detection.box;
            const stressColor =
              smoothed > 66 ? "#F87171" : smoothed > 33 ? "#F59E0B" : "#34C78A";
            ctx.strokeStyle = stressColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.fillStyle = stressColor;
            ctx.font = "bold 11px Nunito, sans-serif";
            ctx.fillText(`Stress ${smoothed}`, box.x, box.y > 14 ? box.y - 6 : box.y + 14);
          }
        } else {
          setFaceDetected(false);
          const ctx = canvasRef.current?.getContext("2d");
          ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        }

        rafRef.current = requestAnimationFrame(detect);
      }

      rafRef.current = requestAnimationFrame(detect);
    }

    startCamera();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      lastScoreRef.current = null;
      setFaceDetected(false);
      if (videoRef.current) { videoRef.current.srcObject = null; }
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    };
  }, [active, modelStatus, onStressUpdate]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (modelStatus === "loading") {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-canvas">
        <Loader aria-hidden="true" className="h-6 w-6 animate-spin text-accent" />
        <p className="text-sm text-muted">Loading face detection models…</p>
      </div>
    );
  }

  if (modelStatus === "error") {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-stressed/20 bg-stressed-soft">
        <CameraOff aria-hidden="true" className="h-6 w-6 text-stressed" />
        <p className="text-sm font-medium text-stressed">Failed to load face detection models.</p>
        <p className="text-xs text-muted">Make sure /public/models/ files are present and reload.</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-canvas">
        <Camera aria-hidden="true" className="h-8 w-8 text-muted" />
        <p className="text-sm text-muted">Camera preview will appear here when face mode is active.</p>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-stressed/20 bg-stressed-soft px-4 text-center">
        <CameraOff aria-hidden="true" className="h-6 w-6 text-stressed" />
        <p className="text-sm font-medium text-stressed">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-ink" aria-label="Camera face stress preview">
      {/* Video feed */}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className="block w-full"
        style={{ transform: "scaleX(-1)" /* mirror for natural selfie view */ }}
      />
      {/* Detection overlay canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ transform: "scaleX(-1)" }}
      />
      {/* Face detected / no-face indicator */}
      <div className="absolute bottom-2 left-2">
        {faceDetected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-calm-soft px-2 py-0.5 text-xs font-semibold text-calm">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-calm" />
            Face detected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-xs font-semibold text-white">
            No face detected
          </span>
        )}
      </div>
      {/* Privacy badge */}
      <div className="absolute right-2 top-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-xs text-white/80">
          🔒 Processed locally
        </span>
      </div>
    </div>
  );
}
