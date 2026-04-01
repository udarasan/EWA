import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import type { Role } from "../lib/api/types";

interface ProtectedRouteProps {
  allowedRole: Role;
  children: ReactNode;
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, token } = useAuth();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== allowedRole) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/employee"} replace />;
  }
  return <>{children}</>;
}

