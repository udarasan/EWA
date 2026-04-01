import { apiRequest } from "./client";
import type { FeedbackItem, FeedbackSummary } from "./types";

export const feedbackApi = {
  listMine(token: string) {
    return apiRequest<{ feedback: FeedbackItem[] }>("/feedback/my", { token });
  },
  summary(token: string) {
    return apiRequest<{ summary: FeedbackSummary }>("/feedback/my/summary", { token });
  },
  submit(token: string, payload: FormData) {
    return apiRequest<{
      message: string;
      feedback: { emotionLabel: string; sentimentScore: number };
    }>("/feedback", {
      method: "POST",
      token,
      body: payload,
    });
  },
  submitVoice(token: string, payload: FormData) {
    return apiRequest<{
      message: string;
      feedback: { mood: string; emotionLabel: string };
    }>("/feedback/voice", {
      method: "POST",
      token,
      body: payload,
    });
  },
};

