import "@uiw/react-md-editor/markdown-editor.css";

import MDEditor from "@uiw/react-md-editor";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { createDiscussion, deleteDiscussion, getMe, listDiscussions, logout } from "../api/client";
import { formatBeijingTimestamp } from "../utils/discussion";

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        {children}
      </svg>
    </span>
  );
}

function CopyIcon() {
  return (
    <Icon>
      <rect x="7" y="4" width="9" height="11" rx="2" />
      <path d="M5 7.5V14a2 2 0 0 0 2 2h5.5" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon>
      <path d="m4.5 10 3.5 3.5 7-7" />
    </Icon>
  );
}

async function copyText(text) {
  if (window.navigator?.clipboard?.writeText) {
    await window.navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function Dialog({ open, onClose, title, children }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="modal-panel w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Confirm action</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4.5 6h11" />
                <path d="M8 3.75h4" />
                <path d="M6.5 6l.6 9.25a1 1 0 0 0 1 .93h3.8a1 1 0 0 0 1-.93L13.5 6" />
              </svg>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const origin = useMemo(() => window.location.origin, []);
  const [user, setUser] = useState(undefined);
  const [discussions, setDiscussions] = useState([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("## Discussion prompt\n\n- What is your main claim?\n- What evidence supports it?");
  const [minutes, setMinutes] = useState(10);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedDiscussionId, setCopiedDiscussionId] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [discussionPendingDelete, setDiscussionPendingDelete] = useState(null);

  useEffect(() => {
    Promise.all([getMe(), listDiscussions()])
      .then(([meData, discussionData]) => {
        setUser(meData.user ?? null);
        setDiscussions(discussionData.discussions ?? []);
        setLoadError("");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setUser(null);
          return;
        }
        setUser(null);
        setLoadError(err.response?.data?.error || "Unable to load your workspace.");
      });
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const created = await createDiscussion({ title, topic, timer_minutes: minutes });
      setDiscussions((current) => [created, ...current]);
      setTitle("");
      setTopic("## Discussion prompt\n\n- What is your main claim?\n- What evidence supports it?");
      setMinutes(10);
      setShowCreateDialog(false);
      navigate(`/discussions/${created.id}/manage`);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create discussion");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleDeleteDiscussion(id) {
    setDeletingId(id);
    setLoadError("");
    try {
      await deleteDiscussion(id);
      setDiscussions((current) => current.filter((discussion) => discussion.id !== id));
      setDiscussionPendingDelete(null);
    } catch (err) {
      setLoadError(err.response?.data?.error || "Unable to delete this discussion.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopyJoinUrl(id, joinUrl) {
    try {
      await copyText(joinUrl);
      setCopiedDiscussionId(id);
      window.setTimeout(() => {
        setCopiedDiscussionId((current) => (current === id ? null : current));
      }, 1400);
    } catch {
      setLoadError("Unable to copy the join link on this browser.");
    }
  }

  if (user === undefined) {
    return <main className="page-loading">Loading dashboard...</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Teacher Workspace</p>
            <h1 className="text-3xl font-medium text-slate-900">Teacher Workspace</h1>
            <p className="mt-1 text-slate-600">
              Welcome back, {user.name}. {user.is_superadmin ? "You can review every teacher's discussions from here." : "Create and manage your student discussion sessions."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" type="button" onClick={() => { setError(""); setShowCreateDialog(true); }}>
              Create new discussion
            </button>
            <button className="secondary-button w-full md:w-auto" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-600">Total Discussions</p>
            <p className="mt-1 text-3xl font-medium text-slate-900">{discussions.length}</p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-600">Active Now</p>
            <p className="mt-1 text-3xl font-medium text-slate-900">
              {discussions.filter((d) => !d.discussion_ended && d.timer_running).length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-slate-600">Completed</p>
            <p className="mt-1 text-3xl font-medium text-slate-900">{discussions.filter((d) => d.discussion_ended).length}</p>
          </div>
        </div>

        <section className="glass-panel p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{user.is_superadmin ? "All Teachers" : "Your Discussions"}</p>
              <h2 className="text-xl font-medium text-slate-900">All Discussions</h2>
            </div>
          </div>
          {loadError ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p> : null}
          <div className="grid gap-4">
            {discussions.map((discussion) => {
              const joinUrl = `${origin}/join/${discussion.join_token}`;
              return (
                <article key={discussion.id} className="rounded-xl border border-[color:var(--color-line)] bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-medium text-slate-900">{discussion.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                            discussion.discussion_ended
                              ? "bg-slate-200 text-slate-700"
                              : discussion.timer_running
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {discussion.discussion_ended ? "Completed" : discussion.timer_running ? "Active" : "Public"}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--color-muted)]">{discussion.topic.replace(/[#*_`>-]/g, " ").trim()}</p>
                      <p className="mt-3 text-sm text-[color:var(--color-muted)]">{formatBeijingTimestamp(discussion.created_at)}</p>
                      {user.is_superadmin && discussion.owner ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Created by <span className="font-medium text-slate-800">{discussion.owner.name}</span>
                          {" · "}
                          {discussion.owner.email}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-stretch gap-2">
                        <div className="min-w-0 flex-1 break-all rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{joinUrl}</div>
                        <button
                          type="button"
                          className="secondary-button px-3"
                          onClick={() => handleCopyJoinUrl(discussion.id, joinUrl)}
                          aria-label={copiedDiscussionId === discussion.id ? "Copied" : "Copy join link"}
                        >
                          {copiedDiscussionId === discussion.id ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link className="primary-button" to={`/discussions/${discussion.id}/manage`}>
                          Manage discussion
                        </Link>
                        <a className="secondary-button" href={joinUrl} target="_blank" rel="noreferrer">
                          Open student link
                        </a>
                        <button
                          type="button"
                          className="danger-button"
                          disabled={deletingId === discussion.id}
                          onClick={() => setDiscussionPendingDelete(discussion)}
                        >
                          {deletingId === discussion.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[color:var(--color-line)] bg-white p-4">
                      <QRCodeSVG value={joinUrl} size={120} />
                    </div>
                  </div>
                </article>
              );
            })}
            {discussions.length === 0 ? (
              <div className="rounded-xl border border-[color:var(--color-line)] bg-white px-6 py-10 text-center text-sm text-[color:var(--color-muted)]">
                No discussions yet. Create your first one to get a join link and QR code.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Dialog open={showCreateDialog} onClose={() => !creating && setShowCreateDialog(false)} title="Create new discussion">
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Title</span>
            <input className="soft-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Topic (Markdown)</span>
            <div data-color-mode="light" className="overflow-hidden rounded-xl border border-[color:var(--color-line)] bg-white">
              <MDEditor value={topic} onChange={(value) => setTopic(value || "")} preview="edit" height={280} visibleDragbar={false} />
            </div>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Timer duration (minutes)</span>
            <input className="soft-input w-32" type="number" min="1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} />
          </label>
          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <button className="secondary-button" type="button" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create discussion"}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(discussionPendingDelete)}
        onClose={() => !deletingId && setDiscussionPendingDelete(null)}
        title="Delete discussion"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-6 text-slate-700">
              Delete this discussion from your workspace view. Existing ideas, records, and join data will remain in the database.
            </p>
            {discussionPendingDelete ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">{discussionPendingDelete.title}</p>
                <p className="mt-1 text-xs text-slate-500">{formatBeijingTimestamp(discussionPendingDelete.created_at)}</p>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="secondary-button"
              type="button"
              disabled={Boolean(deletingId)}
              onClick={() => setDiscussionPendingDelete(null)}
            >
              Cancel
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={!discussionPendingDelete || Boolean(deletingId)}
              onClick={() => discussionPendingDelete && handleDeleteDiscussion(discussionPendingDelete.id)}
            >
              {deletingId ? "Deleting..." : "Delete discussion"}
            </button>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
