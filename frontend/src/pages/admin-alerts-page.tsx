import { AlertTriangle, Calendar, CheckCircle, Clock, Mail, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/auth-context";
import { adminApi } from "../lib/api/admin";
import type { EmployeeInsight } from "../lib/api/types";

type RiskLevel = "high" | "moderate";

interface AlertEmployee extends EmployeeInsight {
  riskLevel: RiskLevel;
  reasons: string[];
}

function classifyEmployees(employees: EmployeeInsight[]): AlertEmployee[] {
  const alerts: AlertEmployee[] = [];

  for (const emp of employees) {
    const reasons: string[] = [];
    const avg = Number(emp.avg_sentiment || 0);
    const neg = Number(emp.negative_count || 0);
    const count = Number(emp.feedback_count);

    if (count === 0) continue;

    if (avg < 0.4) reasons.push(`Low avg sentiment (${avg.toFixed(2)})`);
    if (neg >= 3) reasons.push(`${neg} negative submissions`);
    if (avg >= 0.4 && avg < 0.65 && neg < 3) reasons.push(`Borderline sentiment (${avg.toFixed(2)})`);

    const isHighRisk = avg < 0.4 || neg >= 3;
    const isModerate = !isHighRisk && avg < 0.65;

    if (isHighRisk || isModerate) {
      alerts.push({ ...emp, riskLevel: isHighRisk ? "high" : "moderate", reasons });
    }
  }

  return alerts.sort((a, b) => {
    if (a.riskLevel !== b.riskLevel) return a.riskLevel === "high" ? -1 : 1;
    return Number(a.avg_sentiment || 0) - Number(b.avg_sentiment || 0);
  });
}

function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "high") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-stressed-soft px-2.5 py-0.5 text-xs font-semibold text-stressed">
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
        High risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-moderate-soft px-2.5 py-0.5 text-xs font-semibold text-moderate">
      <Clock aria-hidden="true" className="h-3 w-3" />
      Needs check-in
    </span>
  );
}

function AlertCard({ emp }: { emp: AlertEmployee }) {
  const lastActive = emp.last_feedback_at
    ? new Date(emp.last_feedback_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

  const borderColor = emp.riskLevel === "high" ? "border-stressed/30" : "border-moderate/30";
  const bgColor = emp.riskLevel === "high" ? "bg-stressed-soft/40" : "bg-moderate-soft/40";

  return (
    <div
      className={`overflow-hidden rounded-xl border ${borderColor} ${bgColor} transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        {/* Employee info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{emp.name}</p>
            <RiskBadge level={emp.riskLevel} />
          </div>
          <p className="mt-0.5 text-sm text-muted">{emp.email}</p>

          {/* Risk reasons */}
          <ul className="mt-2 space-y-0.5">
            {emp.reasons.map((reason) => (
              <li key={reason} className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${emp.riskLevel === "high" ? "bg-stressed" : "bg-moderate"}`}
                />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-5 text-sm">
          <div className="text-center">
            <p className="text-xs text-muted">Submissions</p>
            <p className="font-bold text-ink">{emp.feedback_count}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted">Avg sentiment</p>
            <p className={`font-bold ${Number(emp.avg_sentiment) < 0.4 ? "text-stressed" : "text-moderate"}`}>
              {emp.avg_sentiment !== null ? Number(emp.avg_sentiment).toFixed(2) : "—"}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-xs text-muted">
              <Calendar aria-hidden="true" className="h-3 w-3" />
              Last activity
            </div>
            <p className="font-bold text-ink">{lastActive}</p>
          </div>
        </div>
      </div>

      {/* Suggested actions */}
      <div className="flex flex-wrap gap-2 border-t border-border/60 bg-surface/60 px-4 py-3">
        <span className="mr-1 text-xs font-semibold text-muted">Suggested actions:</span>
        <a
          href={`mailto:${emp.email}?subject=Wellness check-in&body=Hi ${emp.name},%0D%0A%0D%0AI wanted to reach out for a brief check-in. Let me know if you'd like to chat.`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-canvas"
        >
          <Mail aria-hidden="true" className="h-3 w-3" />
          Schedule 1-on-1
        </a>
        <a
          href="mailto:?subject=Wellness resources&body=Here are some resources that might help..."
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-canvas"
        >
          <MessageSquare aria-hidden="true" className="h-3 w-3" />
          Share wellness resources
        </a>
      </div>
    </div>
  );
}

export function AdminAlertsPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<EmployeeInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    adminApi
      .employees(token)
      .then((response) => {
        setEmployees(response.employees || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load employee data."))
      .finally(() => setLoading(false));
  }, [token]);

  const alerts = useMemo(() => classifyEmployees(employees), [employees]);
  const highRisk = alerts.filter((a) => a.riskLevel === "high");
  const moderate = alerts.filter((a) => a.riskLevel === "moderate");

  return (
    <DashboardLayout
      role="admin"
      title="Employee alerts"
      subtitle="Employees flagged for elevated stress or low engagement — review and act."
    >
      {error && (
        <div role="alert" className="rounded-xl border border-stressed/20 bg-stressed-soft p-3 text-sm text-stressed">
          {error}
        </div>
      )}

      {/* Summary ribbon */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Alert summary">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total employees</p>
          <p className="mt-2 text-3xl font-bold text-ink">{employees.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">High risk</p>
          <p className="mt-2 text-3xl font-bold text-stressed">{loading ? "—" : highRisk.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Needs check-in</p>
          <p className="mt-2 text-3xl font-bold text-moderate">{loading ? "—" : moderate.length}</p>
        </Card>
      </section>

      {/* All clear state */}
      {!loading && alerts.length === 0 && (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-calm-soft">
              <CheckCircle aria-hidden="true" className="h-8 w-8 text-calm" />
            </div>
            <p className="text-xl font-bold text-ink">All employees are doing well</p>
            <p className="mt-2 max-w-sm text-sm text-muted">
              No employees are currently flagged for elevated stress or low sentiment. Keep encouraging regular check-ins.
            </p>
          </div>
        </Card>
      )}

      {/* Skeleton loaders */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-border" />
          ))}
        </div>
      )}

      {/* High-risk section */}
      {!loading && highRisk.length > 0 && (
        <section aria-label="High risk employees">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 text-stressed" />
            <h2 className="text-base font-bold text-stressed">
              High risk · {highRisk.length} employee{highRisk.length > 1 ? "s" : ""}
            </h2>
          </div>
          <div className="space-y-3">
            {highRisk.map((emp) => (
              <AlertCard key={emp.email} emp={emp} />
            ))}
          </div>
        </section>
      )}

      {/* Needs check-in section */}
      {!loading && moderate.length > 0 && (
        <section aria-label="Employees needing check-in">
          <div className="mb-3 flex items-center gap-2">
            <Clock aria-hidden="true" className="h-4 w-4 text-moderate" />
            <h2 className="text-base font-bold text-moderate">
              Needs check-in · {moderate.length} employee{moderate.length > 1 ? "s" : ""}
            </h2>
          </div>
          <div className="space-y-3">
            {moderate.map((emp) => (
              <AlertCard key={emp.email} emp={emp} />
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
