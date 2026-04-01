import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/auth-context";
import { adminApi } from "../lib/api/admin";
import type { EmployeeInsight } from "../lib/api/types";

function StatusBadge({ item }: { item: EmployeeInsight }) {
  if (Number(item.feedback_count) === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-moderate-soft px-2.5 py-0.5 text-xs font-semibold text-moderate">
        No data
      </span>
    );
  }
  if (Number(item.avg_sentiment || 0) < 0.4 || Number(item.negative_count || 0) >= 3) {
    return (
      <span className="inline-flex items-center rounded-full bg-stressed-soft px-2.5 py-0.5 text-xs font-semibold text-stressed">
        At risk
      </span>
    );
  }
  if (Number(item.avg_sentiment || 0) < 0.65) {
    return (
      <span className="inline-flex items-center rounded-full bg-moderate-soft px-2.5 py-0.5 text-xs font-semibold text-moderate">
        Check-in
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-calm-soft px-2.5 py-0.5 text-xs font-semibold text-calm">
      Stable
    </span>
  );
}

export function AdminEmployeesPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<EmployeeInsight[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    adminApi
      .employees(token)
      .then((response) => setEmployees(response.employees || []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load employee insights."),
      );
  }, [token]);

  const metrics = useMemo(() => {
    const risk = employees.filter(
      (item) =>
        Number(item.avg_sentiment || 0) < 0.4 || Number(item.negative_count || 0) >= 3,
    ).length;
    const noFeedback = employees.filter((item) => Number(item.feedback_count) === 0).length;
    return { total: employees.length, risk, noFeedback };
  }, [employees]);

  return (
    <DashboardLayout
      role="admin"
      title="Employee insights"
      subtitle="Engagement signals and at-risk flags from aggregated feedback."
    >
      {error && (
        <div role="alert" className="rounded-xl border border-stressed/20 bg-stressed-soft p-3 text-sm text-stressed">
          {error}
        </div>
      )}

      {/* Summary metric cards */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Employee summary">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total employees</p>
          <p className="mt-2 text-3xl font-bold text-ink">{metrics.total}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">At risk</p>
          <p className="mt-2 text-3xl font-bold text-stressed">{metrics.risk}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">No feedback yet</p>
          <p className="mt-2 text-3xl font-bold text-moderate">{metrics.noFeedback}</p>
        </Card>
      </section>

      {/* Employee list */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Team overview</h2>
        {employees.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">👥</div>
            <p className="font-semibold text-ink">No employees found</p>
            <p className="mt-1 text-sm text-muted">
              Employees will appear here once they register.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {employees.map((item) => (
              <div
                key={item.email}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-canvas px-4 py-3 transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-sm text-muted">{item.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-5">
                  <div className="text-center">
                    <p className="text-xs text-muted">Submissions</p>
                    <p className="font-bold text-ink">{item.feedback_count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted">Avg sentiment</p>
                    <p className="font-bold text-ink">
                      {item.avg_sentiment !== null
                        ? Number(item.avg_sentiment).toFixed(2)
                        : "—"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted">Last activity</p>
                    <p className="font-bold text-ink">
                      {item.last_feedback_at
                        ? new Date(item.last_feedback_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <StatusBadge item={item} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
