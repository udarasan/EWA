import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import type { Role } from "../../lib/api/types";
import { AppSidebar } from "./app-sidebar";

interface DashboardLayoutProps {
  role: Role;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function DashboardLayout({ role, title, subtitle, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-canvas md:flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-200 md:static md:translate-x-0`}
      >
        <AppSidebar
          role={role}
          onLogout={handleLogout}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-ink/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-canvas"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="font-bold text-ink">SentiSphere</span>
        </div>

        <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
          <header>
            <p className="text-sm text-muted">{subtitle}</p>
            <h1 className="mt-1 text-3xl font-bold text-ink">{title}</h1>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
