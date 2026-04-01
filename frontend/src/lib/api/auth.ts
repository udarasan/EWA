import { apiRequest } from "./client";
import type { AuthResponse, RegisterPayload } from "./types";

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  register(payload: RegisterPayload) {
    return apiRequest<{ message: string }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

