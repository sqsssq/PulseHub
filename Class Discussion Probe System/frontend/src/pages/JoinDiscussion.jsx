import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createJoinIdea, getJoinDiscussion } from "../api/client";
import IdeaCard from "../components/IdeaCard";
import MarkdownContent from "../components/MarkdownContent";
import Timer from "../components/Timer";
import TopicBanner from "../components/TopicBanner";
import useSocket from "../hooks/useSocket";
import useTimer from "../hooks/useTimer";
import { formatBeijingTimestamp, parseServerDate } from "../utils/discussion";

function sortIdeas(ideas) {
  return [...ideas].sort((a, b) => parseServerDate(a.submitted_at) - parseServerDate(b.submitted_at));
}

function mergeIdeas(existingIdeas, incomingIdeas) {
  const byId = new Map(existingIdeas.map((idea) => [idea.id, idea]));
  incomingIdeas.forEach((idea) => {
    byId.set(idea.id, { ...(byId.get(idea.id) || {}), ...idea });
  });
  return sortIdeas([...byId.values()]);
}

export default function JoinDiscussion() {
  const { token } = useParams();
  const groupStorageKey = `pulsehub-group-name:${token}`;
  const authorStorageKey = `pulsehub-author-name:${token}`;
  const [discussion, setDiscussion] = useState(null);
  const [groupInput, setGroupInput] = useState(() => window.localStorage.getItem(groupStorageKey) || "");
  const [groupName, setGroupName] = useState(() => window.localStorage.getItem(groupStorageKey) || "");
  const [nameInput, setNameInput] = useState(() => window.localStorage.getItem(authorStorageKey) || "");
  const [author, setAuthor] = useState(() => window.localStorage.getItem(authorStorageKey) || "");
  const [content, setContent] = useState("");
  const [results, setResults] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    getJoinDiscussion(token).then((data) => {
      setDiscussion(data);
      if (data.discussion_ended) {
        const selected = data.ideas
          .filter((idea) => idea.is_selected)
          .sort((a, b) => (a.share_order === null) - (b.share_order === null) || (a.share_order || 0) - (b.share_order || 0));
        setResults(selected);
      }
    });
  }, [token]);

  useEffect(() => {
    if (!sentinelRef.current || window.innerWidth >= 640) {
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting));
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  useSocket(discussion?.id ? String(discussion.id) : null, {
    idea_added: (idea) => {
      setDiscussion((current) => (current ? { ...current, ideas: mergeIdeas(current.ideas, [idea]) } : current));
    },
    idea_updated: (payload) => {
      setDiscussion((current) =>
        current
          ? { ...current, ideas: current.ideas.map((idea) => (idea.id === payload.id ? { ...idea } : idea)) }
          : current,
      );
    },
    timer_update: (payload) => {
      setDiscussion((current) => current ? { ...current, timer_running: payload.timer_running, seconds_remaining: payload.seconds_remaining } : current);
    },
    session_updated: (payload) => {
      setDiscussion(payload);
      if (payload.discussion_ended) {
        const selected = payload.ideas
          .filter((idea) => idea.is_selected)
          .sort((a, b) => (a.share_order === null) - (b.share_order === null) || (a.share_order || 0) - (b.share_order || 0));
        setResults(selected);
      }
    },
    discussion_ended: (payload) => {
      setDiscussion((current) => (current ? { ...current, discussion_ended: true } : current));
      setResults(payload.selected_ideas || []);
    },
  });

  const displaySeconds = useTimer(discussion?.seconds_remaining || 0, discussion?.timer_running || false);
  const groupIdeas = useMemo(() => sortIdeas((discussion?.ideas || []).filter((idea) => idea.group_id === groupName)), [groupName, discussion?.ideas]);
  const selectedGroupIdeas = useMemo(
    () =>
      sortIdeas(
        (discussion?.ideas || []).filter((idea) => idea.group_id === groupName && idea.is_selected),
      ),
    [groupName, discussion?.ideas],
  );

  function handleEnterGroup(event) {
    event.preventDefault();
    const nextGroup = groupInput.trim();
    const nextName = nameInput.trim();
    if (!nextGroup || !nextName) {
      return;
    }
    window.localStorage.setItem(groupStorageKey, nextGroup);
    window.localStorage.setItem(authorStorageKey, nextName);
    setGroupName(nextGroup);
    setAuthor(nextName);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!content.trim() || !groupName || !author.trim() || isPosting) {
      return;
    }

    setIsPosting(true);
    try {
      const createdIdea = await createJoinIdea(token, {
        group_id: groupName,
        author_name: author.trim(),
        content: content.trim().slice(0, 300),
      });
      setDiscussion((current) => (current ? { ...current, ideas: mergeIdeas(current.ideas, [createdIdea]) } : current));
      setContent("");
    } finally {
      setIsPosting(false);
    }
  }

  if (!discussion) {
    return <main className="page-loading">Loading discussion...</main>;
  }

  if (!groupName || !author) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md">
          <section className="glass-panel-strong p-8">
            <div className="mb-6 text-center">
              <p className="mb-2 text-sm font-medium text-slate-500">{discussion.title}</p>
              <h1 className="text-2xl font-medium text-slate-900">Enter your space</h1>
            </div>
            <div className="mb-4 rounded-lg border border-[color:var(--color-line)] bg-slate-100 p-4">
              <div className="text-sm text-slate-600">
                <MarkdownContent content={discussion.topic} />
              </div>
            </div>
            <form className="mt-8 flex max-w-md flex-col gap-4" onSubmit={handleEnterGroup}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Your name</span>
                <input className="soft-input" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Alex" autoFocus />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Group name</span>
                <input className="soft-input" value={groupInput} onChange={(e) => setGroupInput(e.target.value)} placeholder="e.g. Group 3" />
              </label>
              <button className="primary-button" type="submit">Enter group space</button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] p-4">
        <div ref={sentinelRef} className="h-px" />
        <TopicBanner
          topic={discussion.topic}
          collapsed={collapsed}
          meta={
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-8 items-center rounded-md bg-slate-100 px-3 font-medium text-slate-900">{author}</span>
              <span className="inline-flex min-h-8 items-center rounded-md bg-slate-100 px-3 font-medium text-slate-900">{groupName}</span>
              <Timer seconds={displaySeconds} running={discussion.timer_running} />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <section className="space-y-6">
            <div className="glass-panel p-8">
              <h2 className="mb-5 text-xl font-medium text-slate-900">Share your idea</h2>
              {discussion.discussion_ended ? (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Discussion time has ended. Your previous input remains visible, and selected cards are shown below.
                </p>
              ) : null}
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Card content (Markdown supported)</span>
                  <textarea
                    className="soft-input min-h-48 text-base disabled:cursor-not-allowed disabled:opacity-60"
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, 300))}
                    placeholder="Type your idea here..."
                    rows={7}
                    disabled={discussion.discussion_ended}
                  />
                  <small className="text-sm text-[color:var(--color-muted)]">{content.length}/300</small>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Your name</span>
                  <input
                    className="soft-input disabled:cursor-not-allowed disabled:opacity-60"
                    value={author}
                    onChange={(e) => {
                      setAuthor(e.target.value);
                      window.localStorage.setItem(authorStorageKey, e.target.value);
                    }}
                    placeholder="Your name"
                    disabled={discussion.discussion_ended}
                  />
                </label>
                <button className="primary-button w-full" type="submit" disabled={isPosting || discussion.discussion_ended}>
                  {discussion.discussion_ended ? "Discussion ended" : isPosting ? "Posting..." : "Post card"}
                </button>
              </form>
            </div>

            {discussion.discussion_ended ? (
              <div className="glass-panel p-6">
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-base font-semibold text-emerald-900">These are the cards your group needs to share.</p>
                  <p className="mt-1 text-sm text-emerald-800">Please prepare in the order shown below.</p>
                </div>
                <h3 className="mb-3 text-lg font-medium text-slate-900">Selected from your group</h3>
                {selectedGroupIdeas.length === 0 ? <p className="text-sm text-[color:var(--color-muted)]">No cards from your group were selected.</p> : null}
                <div className="space-y-3">
                  {selectedGroupIdeas
                    .sort((a, b) => (a.share_order ?? Number.MAX_SAFE_INTEGER) - (b.share_order ?? Number.MAX_SAFE_INTEGER))
                    .map((idea, index) => (
                      <div key={idea.id} className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-600 px-2 text-sm font-semibold text-white">
                              {idea.share_order ?? index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-emerald-900">Share Order {idea.share_order ?? index + 1}</p>
                              <p className="text-xs text-slate-500">{formatBeijingTimestamp(idea.submitted_at)}</p>
                            </div>
                          </div>
                        </div>
                        <IdeaCard idea={idea} selected />
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </section>

          <section>
            <div className="glass-panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-600">{groupName}</p>
                  <h2 className="text-xl font-medium text-slate-900">My Group Ideas</h2>
                </div>
                <Timer seconds={displaySeconds} running={discussion.timer_running} />
              </div>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <button type="button" className="secondary-button" onClick={() => { setGroupName(""); setAuthor(""); }}>
                  Change profile
                </button>
              </div>
              {discussion.discussion_ended ? (
                <div className="mt-6 flex flex-col gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Selected ideas</h3>
                  {results.length === 0 ? <p className="text-sm text-[color:var(--color-muted)]">No ideas were selected for sharing.</p> : null}
                  {results.map((idea) => <IdeaCard key={idea.id} idea={idea} selected />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {groupIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
                  {groupIdeas.length === 0 ? <p className="py-8 text-center text-sm text-[color:var(--color-muted)]">No ideas submitted yet</p> : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
