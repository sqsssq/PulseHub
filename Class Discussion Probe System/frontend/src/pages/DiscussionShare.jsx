import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getDiscussion, getMe } from "../api/client";
import useSocket from "../hooks/useSocket";
import MarkdownContent from "../components/MarkdownContent";
import { parseServerDate } from "../utils/discussion";

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        {children}
      </svg>
    </span>
  );
}

function BackIcon() {
  return (
    <Icon>
      <path d="M12.5 4.5 7 10l5.5 5.5" />
      <path d="M7.5 10h7" />
    </Icon>
  );
}

function buildShareGroups(discussion) {
  const ideas = discussion?.ideas || [];
  const groups = discussion?.groups || [];

  return groups
    .map((groupName) => {
      const selectedIdeas = ideas
        .filter((idea) => idea.group_id === groupName && idea.is_selected)
        .sort((a, b) => parseServerDate(a.submitted_at) - parseServerDate(b.submitted_at));

      if (selectedIdeas.length === 0) {
        return null;
      }

      return {
        id: groupName,
        groupName,
        shareOrder: Math.min(...selectedIdeas.map((idea) => idea.share_order ?? Number.MAX_SAFE_INTEGER)),
        ideas: selectedIdeas,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.shareOrder - b.shareOrder || a.groupName.localeCompare(b.groupName));
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

  const shareGroups = useMemo(() => buildShareGroups(discussion), [discussion]);
  const activeGroup = shareGroups[activeIndex] || null;

  useEffect(() => {
    if (activeIndex > Math.max(shareGroups.length - 1, 0)) {
      setActiveIndex(Math.max(shareGroups.length - 1, 0));
    }
  }, [activeIndex, shareGroups.length]);

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
          <div className="flex items-start gap-3">
            <button type="button" className="secondary-button gap-2 px-3" onClick={() => navigate(`/discussions/${discussionId}/manage`)}>
              <BackIcon />
              <span>Back</span>
            </button>
            <div>
              <p className="eyebrow">Sharing View</p>
              <h1 className="text-2xl font-medium text-slate-900">{discussion.title}</h1>
            </div>
          </div>
          <div />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="glass-panel p-4">
            <h2 className="mb-4 text-lg font-medium text-slate-900">Sharing Order</h2>
            <div className="space-y-2">
              {shareGroups.map((group, index) => (
                <button
                  key={group.id}
                  type="button"
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    index === activeIndex ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-white"
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{group.groupName}</p>
                    <p className="text-sm text-slate-600">{group.ideas.length} ideas</p>
                  </div>
                </button>
              ))}
              {shareGroups.length === 0 ? <p className="text-sm text-slate-500">No selected ideas yet.</p> : null}
            </div>
          </aside>

          <section className="glass-panel p-8">
            {activeGroup ? (
              <>
                <div className="mb-4">
                  <div>
                    <p className="eyebrow">Now Sharing</p>
                    <h2 className="whitespace-nowrap text-3xl font-medium text-slate-900">#{activeIndex + 1} · {activeGroup.groupName}</h2>
                  </div>
                </div>
                <div className="space-y-3">
                  {activeGroup.ideas.map((idea, index) => (
                    <div key={idea.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-900 px-2 text-sm font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <MarkdownContent content={idea.content} className="[&_p]:mt-0 [&_p]:text-[1.4rem] [&_p]:leading-8 [&_li]:text-[1.2rem] [&_li]:leading-7 [&_h1]:mt-0 [&_h1]:text-[1.8rem] [&_h2]:mt-0 [&_h2]:text-[1.5rem]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-end justify-center gap-4">
                  <button
                    type="button"
                    className="secondary-button h-11 min-h-11 px-5 text-base"
                    onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
                    disabled={activeIndex === 0}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="primary-button h-11 min-h-11 px-5 text-base"
                    onClick={() => setActiveIndex((current) => Math.min(current + 1, shareGroups.length - 1))}
                    disabled={activeIndex >= shareGroups.length - 1}
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
