import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../components/layout/auth-shell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useAuth } from "../context/auth-context";
import type { Role } from "../lib/api/types";

export function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const response = await register(name.trim(), email.trim(), password, role);
      setStatus(response.message || "Registration successful.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("employee");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      subtitle="Choose your role to get the right level of access."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
            Full name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            required
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email address
          </label>
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <Input
            id="reg-password"
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            required
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-ink">
            Role
          </label>
          <Select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="employee">Employee</option>
            <option value="admin">Admin (HR)</option>
          </Select>
        </div>
        <Button className="mt-2 w-full" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {status && (
        <div role="status" className="mt-4 rounded-xl border border-calm/20 bg-calm-soft p-3 text-sm text-calm">
          {status}
        </div>
      )}
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-stressed/20 bg-stressed-soft p-3 text-sm text-stressed">
          {error}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
