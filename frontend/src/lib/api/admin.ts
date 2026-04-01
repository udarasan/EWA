import { apiRequest } from "./client";
import type { DashboardResponse, EmployeeInsight, TrendResponse } from "./types";

export interface FeedbackFilters {
  language?: string;
  mood?: string;
  emotion?: string;
  fromDate?: string;
  toDate?: string;
  query?: string;
}

function toQuery(filters: FeedbackFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  return params.toString();
}

export const adminApi = {
  dashboard(token: string) {
    return apiRequest<DashboardResponse>("/admin/dashboard", { token });
  },
  trend(token: string, days = 14) {
    return apiRequest<TrendResponse>(`/admin/trend?days=${days}`, { token });
  },
  feedback(token: string, filters: FeedbackFilters) {
    return apiRequest<{ feedback: Array<Record<string, string | number>> }>(
      `/admin/feedback?${toQuery(filters)}`,
      { token },
    );
  },
  employees(token: string) {
    return apiRequest<{ employees: EmployeeInsight[] }>("/admin/employees", { token });
  },
};

