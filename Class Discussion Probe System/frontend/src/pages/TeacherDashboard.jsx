import { useEffect, useMemo, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { getCurrentSession, updateCurrentSession, updateIdea } from "../api/client";
import GroupCard from "../components/GroupCard";
import MarkdownContent from "../components/MarkdownContent";
import Timer from "../components/Timer";
import TopicBanner from "../components/TopicBanner";
import useSocket from "../hooks/useSocket";
import useTimer from "../hooks/useTimer";

function sortIdeas(ideas) {
  return [...ideas].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
}

function selectedIdeas(ideas) {
  return ideas
    .filter((idea) => idea.is_selected)
    .sort((a, b) => (a.share_order === null) - (b.share_order === null) || (a.share_order || 0) - (b.share_order || 0));
}

export default function TeacherDashboard() {
  const [session, setSession] = useState(null);
  const [minutesInput, setMinutesInput] = useState(10);
  const [topicDraft, setTopicDraft] = useState("");
  const [topicDirty, setTopicDirty] = useState(false);
  const [isSavingTopic, setIsSavingTopic] = useState(false);
  const [pulseGroup, setPulseGroup] = useState("");

  useEffect(() => {
    getCurrentSession().then((data) => {
      setSession(data);
      setMinutesInput(Math.max(1, Math.ceil(data.timer_duration / 60)));
      setTopicDraft(data.topic);
    });
  }, []);

  useSocket(session?.id, {
    idea_added: (idea) => {
      setSession((current) => {
        if (!current) {
          return current;
        }
        const nextGroups = current.groups.includes(idea.group_id) ? current.groups : [...current.groups, idea.group_id];
        return { ...current, groups: nextGroups, ideas: sortIdeas([...current.ideas, idea]) };
      });
      setPulseGroup(idea.group_id);
      window.setTimeout(() => setPulseGroup(""), 1000);
    },
    idea_updated: (payload) => {
      setSession((current) =>
        current
          ? {
              ...current,
              ideas: current.ideas.map((idea) =>
                idea.id === payload.id ? { ...idea, is_selected: payload.is_selected, share_order: payload.share_order } : idea,
              ),
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
      setMinutesInput(Math.max(1, Math.ceil(payload.timer_duration / 60)));
      setTopicDraft((current) => (topicDirty ? current : payload.topic));
    },
    discussion_ended: () => {
      setSession((current) => (current ? { ...current, discussion_ended: true, timer_running: false, seconds_remaining: 0 } : current));
    },
  });

  const ideas = session?.ideas || [];
  const selected = useMemo(() => selectedIdeas(ideas), [ideas]);
  const orderCounts = useMemo(
    () =>
      selected.reduce((acc, idea) => {
        if (idea.share_order !== null) {
          acc[idea.share_order] = (acc[idea.share_order] || 0) + 1;
        }
        return acc;
      }, {}),
    [selected],
  );
  const displaySeconds = useTimer(session?.seconds_remaining || 0, session?.timer_running || false);

  async function patchSession(payload) {
    const data = await updateCurrentSession(payload);
    setSession(data);
    setTopicDraft(data.topic);
    setTopicDirty(false);
    return data;
  }

  async function handleTimerStart() {
    if (!session.timer_running) {
      await patchSession({ timer_running: true });
    }
  }

  async function handleTimerPause() {
    if (session.timer_running) {
      await patchSession({ timer_running: false });
    }
  }

  async function handleTimerReset() {
    await patchSession({ reset_timer: true, timer_duration: Math.max(1, minutesInput) * 60 });
  }

  async function handleDurationSave() {
    await patchSession({ timer_duration: Math.max(1, minutesInput) * 60 });
  }

  async function handleTopicSave() {
    if (!topicDraft.trim()) {
      return;
    }
    setIsSavingTopic(true);
    try {
      await patchSession({ topic: topicDraft.trim() });
    } finally {
      setIsSavingTopic(false);
    }
  }

  async function handleToggleIdea(idea, checked) {
    await updateIdea(idea.id, {
      is_selected: checked,
      share_order: checked ? idea.share_order : null,
    });
  }

  async function handleChangeOrder(idea, shareOrder) {
    await updateIdea(idea.id, { is_selected: true, share_order: shareOrder });
  }

  async function handleSelectGroup(groupName) {
    const groupIdeas = sortIdeas(ideas.filter((idea) => idea.group_id === groupName && !idea.is_selected));
    let currentMax = selected.reduce((max, idea) => Math.max(max, idea.share_order || 0), 0);
    for (const idea of groupIdeas) {
      currentMax += 1;
      await updateIdea(idea.id, { is_selected: true, share_order: currentMax });
    }
  }

  async function handleEndDiscussion() {
    if (!window.confirm("This will reveal selected ideas to all students. Continue?")) {
      return;
    }
    await patchSession({ discussion_ended: true });
  }

  if (!session) {
    return <main className="min-h-screen px-6 py-10 text-slate-700">Loading dashboard...</main>;
  }

  return (
    <main className="min-h-screen px-5 pb-8 md:px-8">
      <TopicBanner
        topic={session.topic}
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Timer seconds={displaySeconds} running={session.timer_running} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="primary-button" onClick={handleTimerStart}>
                Start
              </button>
              <button type="button" className="secondary-button" onClick={handleTimerPause}>
                Pause
              </button>
              <button type="button" className="secondary-button" onClick={handleTimerReset}>
                Reset
              </button>
            </div>
            <input
              type="number"
              min="1"
              className="soft-input w-24"
              value={minutesInput}
              disabled={session.timer_running}
              onChange={(event) => setMinutesInput(Number(event.target.value) || 1)}
              onBlur={handleDurationSave}
            />
            <button type="button" className="danger-button" onClick={handleEndDiscussion}>
              End Discussion
            </button>
          </div>
        }
      />

      <section className="glass-panel p-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Discussion topic (Markdown supported)</span>
            <div data-color-mode="light" className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-[0_10px_24px_rgba(39,49,76,0.06)]">
              <MDEditor
                value={topicDraft}
                onChange={(value) => {
                  setTopicDraft(value || "");
                  setTopicDirty(true);
                }}
                preview="edit"
                height={240}
                visibleDragbar={false}
                textareaProps={{
                  placeholder: "Write the discussion topic. Markdown is supported.",
                }}
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-3">
            <div className="glass-panel-strong min-w-[110px] px-4 py-3">
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">Groups</span>
              <strong className="mt-1 block text-2xl text-slate-900">{session.groups.length}</strong>
            </div>
            <div className="glass-panel-strong min-w-[110px] px-4 py-3">
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">Selected</span>
              <strong className="mt-1 block text-2xl text-slate-900">{selected.length}</strong>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button type="button" className="primary-button" onClick={handleTopicSave} disabled={isSavingTopic || !topicDraft.trim()}>
            {isSavingTopic ? "Updating..." : "Update topic"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setTopicDraft(session.topic);
              setTopicDirty(false);
            }}
            disabled={isSavingTopic || topicDraft === session.topic}
          >
            Reset draft
          </button>
        </div>

        <div className="mb-6 rounded-[24px] border border-slate-200/70 bg-white/65 p-5">
          <p className="eyebrow">Topic Preview</p>
          <MarkdownContent content={topicDraft || session.topic} variant="topic" />
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {session.groups.map((group) => (
            <GroupCard
              key={group}
              group={group}
              ideas={sortIdeas(ideas.filter((idea) => idea.group_id === group))}
              selectedCount={Math.max(selected.length, 1)}
              orderCounts={orderCounts}
              onToggleIdea={handleToggleIdea}
              onChangeOrder={handleChangeOrder}
              onSelectGroup={() => handleSelectGroup(group)}
              pulse={pulseGroup === group}
            />
          ))}
          {session.groups.length === 0 ? (
            <div className="glass-panel-strong col-span-full px-6 py-10 text-center text-sm text-[color:var(--color-muted)]">
              No groups yet. Students will appear here as soon as they post a card.
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
