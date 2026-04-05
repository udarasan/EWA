import { Bell, LayoutDashboard, ListFilter, LogOut, MessageSquareText, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { Role } from "../../lib/api/types";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface AppSidebarProps {
  role: Role;
  onLogout: () => void;
  onNavigate?: () => void;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent-soft hover:text-accent",
    isActive ? "bg-accent-soft text-accent" : "text-muted",
  );

export function AppSidebar({ role, onLogout, onNavigate }: AppSidebarProps) {
  const isAdmin = role === "admin";

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-surface md:w-64">
      <div className="px-6 py-5">
        <p className="text-xl font-bold text-ink">SentiSphere</p>
        <p className="mt-0.5 text-xs text-muted">
          {isAdmin ? "HR Command Center" : "Wellness Studio"}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main navigation">
        {role === "employee" ? (
          <NavLink to="/employee" onClick={onNavigate} className={navLinkClass}>
            <MessageSquareText aria-hidden="true" className="h-5 w-5 shrink-0" />
            My check-ins
          </NavLink>
        ) : (
          <>
            <NavLink to="/admin" end onClick={onNavigate} className={navLinkClass}>
              <LayoutDashboard aria-hidden="true" className="h-5 w-5 shrink-0" />
              Dashboard
            </NavLink>
            <NavLink to="/admin/feedback" onClick={onNavigate} className={navLinkClass}>
              <ListFilter aria-hidden="true" className="h-5 w-5 shrink-0" />
              Feedback explorer
            </NavLink>
            <NavLink to="/admin/employees" onClick={onNavigate} className={navLinkClass}>
              <Users aria-hidden="true" className="h-5 w-5 shrink-0" />
              Employee insights
            </NavLink>
            <NavLink to="/admin/alerts" onClick={onNavigate} className={navLinkClass}>
              <Bell aria-hidden="true" className="h-5 w-5 shrink-0" />
              Alerts
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted hover:text-stressed"
          onClick={onLogout}
        >
          <LogOut aria-hidden="true" className="mr-2 h-5 w-5" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
