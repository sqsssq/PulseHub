import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getDiscussion, getMe } from "../api/client";
import useSocket from "../hooks/useSocket";
import MarkdownContent from "../components/MarkdownContent";
import { parseServerDate } from "../utils/discussion";

function sortSelectedIdeas(ideas = []) {
  return [...ideas]
    .filter((idea) => idea.is_selected)
    .sort((a, b) => (a.share_order ?? Number.MAX_SAFE_INTEGER) - (b.share_order ?? Number.MAX_SAFE_INTEGER) || parseServerDate(a.submitted_at) - parseServerDate(b.submitted_at));
}

export default function DiscussionShare() {
  const navigate = useNavigate();
  const { id } = useParams();
  const discussionId = Number(id);
  const [user, setUser] = useState(undefined);
  const [discussion, setDiscussion] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([getMe(), getDiscussion(discussionId)])
      .then(([meData, discussionData]) => {
        setUser(meData.user ?? null);
        setDiscussion(discussionData);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setUser(null);
          return;
        }
        setUser(true);
        setLoadError(err.response?.data?.error || "Unable to load the sharing view.");
      });
  }, [discussionId]);

  useSocket(discussion?.id ? String(discussion.id) : null, {
    session_updated: (payload) => setDiscussion(payload),
    idea_added: (idea) =>
      setDiscussion((current) =>
        current ? { ...current, ideas: [...current.ideas.filter((entry) => entry.id !== idea.id), idea] } : current,
      ),
    idea_updated: (payload) =>
      setDiscussion((current) =>
        current
          ? {
              ...current,
              ideas: current.ideas.map((idea) =>
                idea.id === payload.id ? { ...idea, is_selected: payload.is_selected, share_order: payload.share_order } : idea,
              ),
            }
          : current,
      ),
    discussion_ended: () => {},
    timer_update: () => {},
  });

  const selectedIdeas = useMemo(() => sortSelectedIdeas(discussion?.ideas || []), [discussion?.ideas]);
  const activeIdea = selectedIdeas[activeIndex] || null;

  useEffect(() => {
    if (activeIndex > Math.max(selectedIdeas.length - 1, 0)) {
      setActiveIndex(Math.max(selectedIdeas.length - 1, 0));
    }
  }, [activeIndex, selectedIdeas.length]);

  if (user === undefined || (!discussion && !loadError)) {
    return <main className="page-loading">Loading share view...</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loadError) {
    return <main className="page-loading">{loadError}</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-line)] bg-white p-5">
          <div>
            <p className="eyebrow">Sharing View</p>
            <h1 className="text-2xl font-medium text-slate-900">{discussion.title}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="secondary-button" onClick={() => navigate(`/discussions/${discussionId}/manage`)}>
              Back to manage
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="glass-panel p-4">
            <h2 className="mb-4 text-lg font-medium text-slate-900">Sharing Order</h2>
            <div className="space-y-2">
              {selectedIdeas.map((idea, index) => (
                <button
                  key={idea.id}
                  type="button"
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    index === activeIndex ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-white"
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">
                    {idea.share_order ?? index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{idea.group_id}</p>
                    <p className="line-clamp-2 text-sm text-slate-600">{idea.content}</p>
                  </div>
                </button>
              ))}
              {selectedIdeas.length === 0 ? <p className="text-sm text-slate-500">No selected ideas yet.</p> : null}
            </div>
          </aside>

          <section className="glass-panel p-8">
            {activeIdea ? (
              <>
                <div className="mb-5">
                  <div>
                    <p className="eyebrow">Now Sharing</p>
                    <h2 className="text-3xl font-medium text-slate-900">#{activeIdea.share_order ?? activeIndex + 1} · {activeIdea.group_id}</h2>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                  <MarkdownContent content={activeIdea.content} className="[&_p]:text-2xl [&_li]:text-xl [&_h1]:text-3xl [&_h2]:text-2xl" />
                </div>
                <div className="mt-6 flex flex-wrap gap-4">
                  <button
                    type="button"
                    className="secondary-button h-12 min-h-12 px-6 text-base"
                    onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
                    disabled={activeIndex === 0}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="primary-button h-12 min-h-12 px-6 text-base"
                    onClick={() => setActiveIndex((current) => Math.min(current + 1, selectedIdeas.length - 1))}
                    disabled={activeIndex >= selectedIdeas.length - 1}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No selected ideas to present.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
