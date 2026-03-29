import { useEffect, useMemo, useRef, useState } from "react";
import { createCurrentIdea, getCurrentSession } from "../api/client";
import IdeaCard from "../components/IdeaCard";
import MarkdownContent from "../components/MarkdownContent";
import Timer from "../components/Timer";
import TopicBanner from "../components/TopicBanner";
import useSocket from "../hooks/useSocket";
import useTimer from "../hooks/useTimer";

const GROUP_STORAGE_KEY = "pulsehub-group-name";

function sortIdeas(ideas) {
  return [...ideas].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
}

export default function StudentView() {
  const [session, setSession] = useState(null);
  const [groupInput, setGroupInput] = useState(() => window.localStorage.getItem(GROUP_STORAGE_KEY) || "");
  const [groupName, setGroupName] = useState(() => window.localStorage.getItem(GROUP_STORAGE_KEY) || "");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [results, setResults] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    getCurrentSession().then((data) => {
      setSession(data);
      if (data.discussion_ended) {
        const selected = data.ideas
          .filter((idea) => idea.is_selected)
          .sort((a, b) => (a.share_order === null) - (b.share_order === null) || (a.share_order || 0) - (b.share_order || 0));
        setResults(selected);
      }
    });
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || window.innerWidth >= 640) {
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setCollapsed(!entry.isIntersecting);
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  useSocket(session?.id, {
    idea_added: (idea) => {
      setSession((current) => (current ? { ...current, ideas: sortIdeas([...current.ideas, idea]) } : current));
    },
    idea_updated: (payload) => {
      setSession((current) =>
        current
          ? {
              ...current,
              ideas: current.ideas.map((idea) => (idea.id === payload.id ? { ...idea } : idea)),
            }
          : current,
      );
    },
    timer_update: (payload) => {
      setSession((current) =>
        current ? { ...current, timer_running: payload.timer_running, seconds_remaining: payload.seconds_remaining } : current,
      );
    },
    session_updated: (payload) => {
      setSession(payload);
      if (payload.discussion_ended) {
        const selected = payload.ideas
          .filter((idea) => idea.is_selected)
          .sort((a, b) => (a.share_order === null) - (b.share_order === null) || (a.share_order || 0) - (b.share_order || 0));
        setResults(selected);
      }
    },
    discussion_ended: (payload) => {
      setSession((current) => (current ? { ...current, discussion_ended: true } : current));
      setResults(payload.selected_ideas || []);
    },
  });

  const displaySeconds = useTimer(session?.seconds_remaining || 0, session?.timer_running || false);
  const groupIdeas = useMemo(
    () => sortIdeas((session?.ideas || []).filter((idea) => idea.group_id === groupName)),
    [groupName, session?.ideas],
  );

  function handleEnterGroup(event) {
    event.preventDefault();
    const nextGroup = groupInput.trim();
    if (!nextGroup) {
      return;
    }
    window.localStorage.setItem(GROUP_STORAGE_KEY, nextGroup);
    setGroupName(nextGroup);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!content.trim() || !groupName) {
      return;
    }
    await createCurrentIdea({
      group_id: groupName,
      author_name: author,
      content: content.trim().slice(0, 300),
    });
    setContent("");
    setAuthor("");
  }

  if (!session) {
    return <main className="min-h-screen px-6 py-10 text-slate-700">Loading session...</main>;
  }

  if (!groupName) {
    return (
      <main className="min-h-screen px-5 py-10 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-panel-strong px-8 py-10">
            <p className="eyebrow">Classroom Probe</p>
            <h1 className="font-[var(--font-display)] text-5xl leading-none tracking-[-0.04em] text-slate-900 md:text-7xl">
              Join your group studio
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--color-muted)]">
              Enter your group name to open a shared board for live class discussion. Your ideas will appear instantly for everyone in the same group.
            </p>

            <form className="mt-8 flex max-w-md flex-col gap-4" onSubmit={handleEnterGroup}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Group name</span>
                <input
                  className="soft-input"
                  value={groupInput}
                  onChange={(event) => setGroupInput(event.target.value)}
                  placeholder="e.g. Group 3"
                  autoFocus
                />
              </label>
              <button className="primary-button" type="submit">
                Enter group space
              </button>
            </form>
          </section>

          <section className="glass-panel overflow-hidden bg-white/70">
            <div className="border-b border-slate-200/70 px-6 py-5">
              <p className="eyebrow">How It Works</p>
              <h2 className="text-2xl font-semibold text-slate-900">One room, many group spaces</h2>
            </div>
            <div className="grid gap-4 px-6 py-6 text-sm leading-6 text-slate-700">
              <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--color-brand)]">Step 1</span>
                <p className="mt-2">Choose your group name. This becomes your shared discussion lane.</p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--color-brand)]">Step 2</span>
                <p className="mt-2">Post cards with ideas, arguments, or open questions while the class is discussing.</p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--color-brand)]">Step 3</span>
                <p className="mt-2">Your teacher can watch all groups from the admin view and pick cards to surface later.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 pb-8 md:px-8">
      <div ref={sentinelRef} className="h-px" />
      <TopicBanner
        topic={session.topic}
        collapsed={collapsed}
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-9 items-center rounded-full bg-[linear-gradient(135deg,rgba(56,80,166,0.12),rgba(56,80,166,0.18))] px-4 font-semibold text-[color:var(--color-brand)]">
              {groupName}
            </span>
            <Timer seconds={displaySeconds} running={session.timer_running} />
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-[minmax(280px,0.88fr)_minmax(0,1.12fr)]">
        <section className="glass-panel-strong sticky top-24 h-fit p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Your Space</p>
              <span className="inline-flex min-h-9 items-center rounded-full bg-[linear-gradient(135deg,rgba(56,80,166,0.12),rgba(56,80,166,0.18))] px-4 font-semibold text-[color:var(--color-brand)]">
                {groupName}
              </span>
            </div>
            <button type="button" className="secondary-button" onClick={() => setGroupName("")}>
              Change group
            </button>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">Discussion Prompt</h2>
          <MarkdownContent content={session.topic} variant="topic" className="mt-3" />

          {session.discussion_ended ? (
            <div className="mt-6 flex flex-col gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Selected ideas</h3>
              {results.length === 0 ? <p className="text-sm text-[color:var(--color-muted)]">No ideas were selected for sharing.</p> : null}
              {results.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} selected />
              ))}
            </div>
          ) : (
            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Add a card (Markdown supported)</span>
                <textarea
                  className="soft-input min-h-36"
                  value={content}
                  onChange={(event) => setContent(event.target.value.slice(0, 300))}
                  placeholder="Share your thought... You can use Markdown like **bold**, - lists, or `code`."
                  rows={5}
                />
                <small className="text-sm text-[color:var(--color-muted)]">{content.length}/300</small>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Your name (optional)</span>
                <input
                  className="soft-input"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="Your name (optional)"
                />
              </label>
              <button className="primary-button" type="submit">
                Post card
              </button>
            </form>
          )}
        </section>

        <section className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Live Feed</p>
              <h2 className="text-2xl font-semibold text-slate-900">{groupName} Cards</h2>
            </div>
            <span className="inline-flex min-h-10 items-center rounded-full border border-slate-200/70 bg-white/72 px-4 font-semibold text-[color:var(--color-brand-dark)]">
              {groupIdeas.length} total
            </span>
          </div>

          <div className="flex min-h-[220px] flex-col gap-3">
            {groupIdeas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
            {groupIdeas.length === 0 ? <p className="text-sm text-[color:var(--color-muted)]">No cards yet. Add the first one.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
