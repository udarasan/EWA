import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/auth-context";
import { adminApi } from "../lib/api/admin";
import { stressBandFromMood } from "../lib/format";
import type { DashboardResponse, TrendResponse } from "../lib/api/types";

const sentimentPalette = ["#34C78A", "#F87171", "#F59E0B"];

function StressBandBadge({ band }: { band: string }) {
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

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse["trend"]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([adminApi.dashboard(token), adminApi.trend(token)])
      .then(([dashboardData, trendData]) => {
        setDashboard(dashboardData);
        setTrend(trendData.trend || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."));
  }, [token]);

  const sentimentData = useMemo(
    () =>
      dashboard
        ? Object.entries(dashboard.sentiment).map(([key, value]) => ({ name: key, value }))
        : [],
    [dashboard],
  );

  return (
    <DashboardLayout
      role="admin"
      title="HR dashboard"
      subtitle="Sentiment mix, stress bands, and recent submissions."
    >
      {error && (
        <div role="alert" className="rounded-xl border border-stressed/20 bg-stressed-soft p-3 text-sm text-stressed">
          {error}
        </div>
      )}

      {/* Summary stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Summary statistics">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total feedback</p>
          <p className="mt-2 text-3xl font-bold text-ink">{dashboard?.totalFeedback ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Positive</p>
          <p className="mt-2 text-3xl font-bold text-calm">{dashboard?.sentiment.Positive ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Negative</p>
          <p className="mt-2 text-3xl font-bold text-stressed">{dashboard?.sentiment.Negative ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Neutral</p>
          <p className="mt-2 text-3xl font-bold text-moderate">{dashboard?.sentiment.Neutral ?? "—"}</p>
        </Card>
      </section>

      {/* Charts row */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-ink">Sentiment mix</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  dataKey="value"
                  data={sentimentData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={entry.name} fill={sentimentPalette[index % sentimentPalette.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-ink">Stress bands</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(dashboard?.moodDistribution || []).map((item) => ({
                  mood: stressBandFromMood(item.mood),
                  count: Number(item.count),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" />
                <XAxis dataKey="mood" tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Trend area chart */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Submission volume (14 days)</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366F1"
                fill="rgba(99,102,241,0.10)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent feedback list */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Recent feedback</h2>
        {!dashboard?.recentFeedback?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">💬</div>
            <p className="font-semibold text-ink">No feedback yet</p>
            <p className="mt-1 text-sm text-muted">Employee submissions will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {dashboard.recentFeedback.map((item, index) => (
              <div
                key={`${item.employee_name}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-4 py-3 transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{item.employee_name}</span>
                    <span className="text-xs text-muted">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  {item.message && (
                    <p className="mt-0.5 max-w-lg truncate text-sm text-muted">{item.message}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted">{item.emotion_label}</span>
                  <StressBandBadge band={stressBandFromMood(item.mood)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
