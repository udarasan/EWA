/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../lib/api/auth";
import { storage } from "../lib/storage";
import type { Role, User } from "../lib/api/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  register: (
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [user, setUser] = useState<User | null>(() => storage.getUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      async login(email, password) {
        const data = await authApi.login(email, password);
        storage.setToken(data.token);
        storage.setUser(data.user);
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      logout() {
        storage.clear();
        setToken(null);
        setUser(null);
      },
      register(name, email, password, role) {
        return authApi.register({ name, email, password, role });
      },
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

