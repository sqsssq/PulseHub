import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectTo = location.state?.from || "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Login failed. Check your email and password.");
      } else {
        setError(err.response?.data?.error || "Unable to sign in right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 md:px-8">
      <div className="mx-auto max-w-xl">
        <section className="glass-panel-strong px-8 py-10">
          <p className="eyebrow">Teacher Sign In</p>
          <h1 className="text-2xl font-medium leading-tight text-slate-900">Sign in</h1>
          <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input className="soft-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input className="soft-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          </form>
          <p className="mt-5 text-sm text-[color:var(--color-muted)]">
            No account yet? <Link className="text-[color:var(--color-brand)] underline" to="/register">Create one</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
