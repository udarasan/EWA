import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
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
import { Link } from "react-router-dom";
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

  const weekComparison = useMemo(() => {
    if (trend.length < 7) return null;
    const thisWeek = trend.slice(-7).reduce((s, d) => s + d.count, 0);
    const lastWeek = trend.slice(-14, -7).reduce((s, d) => s + d.count, 0);
    const delta = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    const mostActive = trend.slice(-7).reduce(
      (max, d) => (d.count > max.count ? d : max),
      trend[trend.length - 7],
    );
    return { thisWeek, lastWeek, delta, mostActiveDay: mostActive?.day ?? "—" };
  }, [trend]);

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

      {/* Week-over-week comparison */}
      {weekComparison && (
        <section aria-label="Week-over-week comparison">
          <h2 className="mb-3 text-base font-semibold text-ink">This week vs last week</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Submissions comparison */}
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Submissions this week</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-bold text-ink">{weekComparison.thisWeek}</p>
                {weekComparison.delta !== null && (
                  <span
                    className={`mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      weekComparison.delta > 0
                        ? "bg-calm-soft text-calm"
                        : weekComparison.delta < 0
                        ? "bg-stressed-soft text-stressed"
                        : "bg-canvas text-muted"
                    }`}
                  >
                    {weekComparison.delta > 0 ? "+" : ""}{weekComparison.delta}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                vs {weekComparison.lastWeek} last week
              </p>
            </Card>

            {/* Trend direction */}
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Engagement trend</p>
              <div className="mt-2 flex items-center gap-2">
                {weekComparison.delta === null ? (
                  <p className="text-lg font-bold text-muted">Not enough data</p>
                ) : weekComparison.delta >= 0 ? (
                  <>
                    <TrendingUp aria-hidden="true" className="h-7 w-7 text-calm" />
                    <div>
                      <p className="text-lg font-bold text-calm">Improving</p>
                      <p className="text-xs text-muted">More check-ins than last week</p>
                    </div>
                  </>
                ) : (
                  <>
                    <TrendingDown aria-hidden="true" className="h-7 w-7 text-stressed" />
                    <div>
                      <p className="text-lg font-bold text-stressed">Declining</p>
                      <p className="text-xs text-muted">Fewer check-ins than last week</p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Most active day */}
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Most active day</p>
              <p className="mt-2 text-2xl font-bold text-ink">{weekComparison.mostActiveDay}</p>
              <p className="mt-1 text-xs text-muted">Highest submission day this week</p>
            </Card>
          </div>
        </section>
      )}

      {/* Alert shortcut — shown when there may be at-risk employees */}
      {(dashboard?.sentiment.Negative ?? 0) > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-stressed/20 bg-stressed-soft px-4 py-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg">⚠️</span>
            <p className="text-sm font-medium text-stressed">
              {dashboard!.sentiment.Negative} negative submission{dashboard!.sentiment.Negative > 1 ? "s" : ""} detected — some employees may need attention.
            </p>
          </div>
          <Link
            to="/admin/alerts"
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-stressed hover:underline"
          >
            View alerts
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      )}

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
