import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/client";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ name, email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create account right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 md:px-8">
      <div className="mx-auto max-w-xl">
        <section className="glass-panel-strong px-8 py-10">
          <p className="eyebrow">Teacher Account</p>
          <h1 className="text-2xl font-medium leading-tight text-slate-900">Create account</h1>
          <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Name</span>
              <input className="soft-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input className="soft-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input className="soft-input" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
          </form>
          <p className="mt-5 text-sm text-[color:var(--color-muted)]">
            Already have an account? <Link className="text-[color:var(--color-brand)] underline" to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
