import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useAuth } from "../context/auth-context";
import { adminApi, type FeedbackFilters } from "../lib/api/admin";
import { stressBandFromMood } from "../lib/format";

function StressLabel({ mood }: { mood: string }) {
  const band = stressBandFromMood(String(mood));
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

export function AdminFeedbackPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<FeedbackFilters>({
    language: "",
    mood: "",
    emotion: "",
    fromDate: "",
    toDate: "",
    query: "",
  });
  const [rows, setRows] = useState<Array<Record<string, string | number>>>([]);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    setError("");
    try {
      const response = await adminApi.feedback(token, filters);
      setRows(response.feedback || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback.");
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateFilter = (name: keyof FeedbackFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [name]: value }));

  return (
    <DashboardLayout
      role="admin"
      title="Feedback explorer"
      subtitle="Filter and search multilingual records."
    >
      {/* Filter card */}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Filters</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Select
            value={filters.language}
            onChange={(event) => updateFilter("language", event.target.value)}
            aria-label="Language filter"
          >
            <option value="">All languages</option>
            <option value="English">English</option>
            <option value="Sinhala">Sinhala</option>
            <option value="Tamil">Tamil</option>
          </Select>
          <Select
            value={filters.mood}
            onChange={(event) => updateFilter("mood", event.target.value)}
            aria-label="Stress level filter"
          >
            <option value="">All stress levels</option>
            <option value="Happy">Low (model)</option>
            <option value="Neutral">Medium (model)</option>
            <option value="Stressed">High (model)</option>
            <option value="Angry">Angry (legacy)</option>
          </Select>
          <Select
            value={filters.emotion}
            onChange={(event) => updateFilter("emotion", event.target.value)}
            aria-label="Emotion filter"
          >
            <option value="">All emotions</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative</option>
          </Select>
          <Input
            type="date"
            value={filters.fromDate}
            onChange={(event) => updateFilter("fromDate", event.target.value)}
            aria-label="From date"
          />
          <Input
            type="date"
            value={filters.toDate}
            onChange={(event) => updateFilter("toDate", event.target.value)}
            aria-label="To date"
          />
          <Input
            value={filters.query}
            placeholder="Search name or message"
            onChange={(event) => updateFilter("query", event.target.value)}
            aria-label="Search query"
          />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Button onClick={load}>
            <Search aria-hidden="true" className="mr-2 h-4 w-4" />
            Apply filters
          </Button>
          <p className="text-sm text-muted">
            {rows.length} record{rows.length === 1 ? "" : "s"} found
          </p>
        </div>
      </Card>

      {/* Results */}
      <Card>
        {error && (
          <div role="alert" className="mb-4 rounded-xl bg-stressed-soft p-3 text-sm text-stressed">
            {error}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl" aria-hidden="true">🔍</div>
            <p className="font-semibold text-ink">No records found</p>
            <p className="mt-1 text-sm text-muted">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((item, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-4 py-3 transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">
                      {String(item.employee_name ?? "")}
                    </span>
                    <span className="text-xs text-muted">
                      {String(item.employee_email ?? "")}
                    </span>
                  </div>
                  {item.message && (
                    <p className="mt-0.5 max-w-lg truncate text-sm text-muted">
                      {String(item.message ?? "")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted">{String(item.emotion_label ?? "")}</p>
                    <p className="text-xs font-medium text-ink">
                      Score: {Number(item.sentiment_score ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <StressLabel mood={String(item.mood ?? "")} />
                  <p className="text-xs text-muted">
                    {item.created_at
                      ? new Date(String(item.created_at)).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
