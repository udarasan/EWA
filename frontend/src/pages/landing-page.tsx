import { Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12 text-center">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-10 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
          <Activity aria-hidden="true" className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-4xl font-bold text-ink">SentiSphere</h1>
        <p className="mt-3 text-muted">
          Real-time stress detection and employee wellbeing insights — powered by voice and language analysis.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/login">
            <Button size="lg">
              Sign in
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="outline">
              Create account
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
          {[
            { emoji: "🎙️", label: "Voice analysis" },
            { emoji: "📊", label: "Sentiment tracking" },
            { emoji: "🛡️", label: "Fully private" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-2xl" aria-hidden="true">{item.emoji}</div>
              <p className="mt-1 text-xs font-medium text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
