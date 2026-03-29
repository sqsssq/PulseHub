import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getMe } from "../api/client";

export default function Home() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    getMe().then((data) => setUser(data.user ?? null));
  }, []);

  if (user === undefined) {
    return <main className="page-loading">Loading...</main>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel-strong px-8 py-10">
          <p className="mb-2 text-sm font-medium text-slate-500">PulseHub</p>
          <h1 className="text-3xl leading-tight font-medium text-slate-900 md:text-4xl">
            Create and run classroom discussions.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)] md:text-base">
            Teachers create a discussion, share a join link or QR code, and monitor group cards in real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="primary-button" to="/register">Create teacher account</Link>
            <Link className="secondary-button" to="/login">Sign in</Link>
          </div>
        </section>

        <section className="glass-panel overflow-hidden">
          <div className="border-b border-[color:var(--color-line)] px-6 py-4">
            <p className="eyebrow">Flow</p>
            <h2 className="text-lg font-medium text-slate-900">3 steps</h2>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm text-slate-700">
            <div className="flex items-start gap-3 rounded-lg bg-white px-4 py-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">1</span>
              <p>Create a discussion with a title, prompt, and timer.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-white px-4 py-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">2</span>
              <p>Share the join link or QR code with students.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-white px-4 py-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">3</span>
              <p>Students post cards while the teacher monitors all groups.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
