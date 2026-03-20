/**
 * Stress scores come only from the Python FastAPI service (model/app.py).
 * Configure STRESS_API_URL; there is no keyword fallback.
 */

const normalizeBaseUrl = (url) => String(url || "").trim().replace(/\/$/, "");

/** Maps API stress_level text to DB mood ENUM (legacy column, used in admin charts). */
const stressLevelToMood = (stressLevel) => {
  const s = String(stressLevel || "").toLowerCase();
  if (s.includes("low")) return "Happy";
  if (s.includes("high")) return "Stressed";
  return "Neutral";
};

const mapApiPayloadToSentiment = (data) => {
  if (!data || typeof data !== "object") return null;
  const stressScore = Number(data.stress_score);
  if (Number.isNaN(stressScore)) return null;

  const sentimentScore = Math.round((Math.min(100, Math.max(0, stressScore)) / 100) * 100) / 100;
  const raw = String(data.label || "").toUpperCase();
  let emotionLabel = "Neutral";
  if (raw === "POSITIVE") emotionLabel = "Positive";
  else if (raw === "NEGATIVE") emotionLabel = "Negative";
  else if (raw === "NEUTRAL") emotionLabel = "Neutral";

  return {
    sentimentScore,
    emotionLabel,
    stressLevel: String(data.stress_level || "")
  };
};

async function fetchStressAnalysis(message) {
  const base = normalizeBaseUrl(process.env.STRESS_API_URL);
  if (!base) return null;

  const timeoutMs = Number(process.env.STRESS_API_TIMEOUT_MS) || 15000;
  const url = `${base}/analyze`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: String(message) }),
      signal: controller.signal
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @returns {Promise<{ sentimentScore: number, emotionLabel: string, mood: string }>}
 */
export const generateSentimentFromText = async (message = "") => {
  const base = normalizeBaseUrl(process.env.STRESS_API_URL);
  if (!base) {
    throw new Error(
      "Stress analysis is not configured. Set STRESS_API_URL in the server environment."
    );
  }

  const payload = await fetchStressAnalysis(message);
  const mapped = mapApiPayloadToSentiment(payload);
  if (!mapped) {
    throw new Error(
      "Stress analysis service did not return a valid result. Check that the model API is running."
    );
  }

  const mood = stressLevelToMood(mapped.stressLevel);
  const sentimentScore =
    Math.round(Math.min(0.99, Math.max(0.01, mapped.sentimentScore)) * 100) / 100;

  return { sentimentScore, emotionLabel: mapped.emotionLabel, mood };
};
