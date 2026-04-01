import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="mb-8 text-center">
        <Link to="/" className="text-2xl font-bold text-ink hover:text-accent transition-colors">
          SentiSphere
        </Link>
        <p className="mt-1 text-sm text-muted">Workplace wellbeing, intelligently measured</p>
      </div>
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
