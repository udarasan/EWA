export function stressBandFromMood(mood: string) {
  if (mood === "Happy") return "Low";
  if (mood === "Stressed" || mood === "Angry") return "High";
  return "Medium";
}

