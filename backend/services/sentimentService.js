/**
 * Placeholder sentiment engine.
 * TODO: Replace this logic with a Python FastAPI AI microservice call.
 */
export const generateSentimentFromText = (message = "", mood = "Neutral") => {
  const text = String(message).toLowerCase();

  let sentimentScore = 0.5;
  let emotionLabel = "Neutral";

  if (text.includes("happy") || text.includes("good")) {
    sentimentScore = 0.85;
    emotionLabel = "Positive";
  } else if (text.includes("bad") || text.includes("stress")) {
    sentimentScore = 0.2;
    emotionLabel = "Negative";
  }

  if (mood === "Happy") {
    sentimentScore = Math.max(sentimentScore, 0.75);
    emotionLabel = emotionLabel === "Negative" ? "Neutral" : "Positive";
  } else if (mood === "Stressed" || mood === "Angry") {
    sentimentScore = Math.min(sentimentScore, 0.35);
    emotionLabel = emotionLabel === "Positive" ? "Neutral" : "Negative";
  }

  return { sentimentScore, emotionLabel };
};
