export type Role = "admin" | "employee";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface FeedbackItem {
  id: number;
  message: string;
  language: string;
  mood: string;
  emotion_label: string;
  sentiment_score: number;
  created_at: string;
}

export interface FeedbackSummary {
  total_count: number;
  avg_sentiment: number;
  positive_count: number;
  negative_count: number;
}

export interface DashboardResponse {
  totalFeedback: number;
  sentiment: Record<"Positive" | "Negative" | "Neutral", number>;
  moodDistribution: Array<{ mood: string; count: number }>;
  recentFeedback: Array<{
    employee_name: string;
    created_at: string;
    language: string;
    mood: string;
    emotion_label: string;
    sentiment_score: number;
    message: string;
  }>;
}

export interface TrendResponse {
  days: number;
  trend: Array<{ day: string; count: number }>;
}

export interface EmployeeInsight {
  name: string;
  email: string;
  feedback_count: number;
  avg_sentiment: number | null;
  negative_count: number;
  last_feedback_at: string | null;
}

