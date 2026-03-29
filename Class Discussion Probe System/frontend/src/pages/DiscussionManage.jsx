import "@uiw/react-md-editor/markdown-editor.css";

import { useEffect, useMemo, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { QRCodeSVG } from "qrcode.react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getDiscussion, getMe, updateDiscussion, updateDiscussionGroupSelection, updateIdea } from "../api/client";
import Timer from "../components/Timer";
import useSocket from "../hooks/useSocket";
import useTimer from "../hooks/useTimer";
import { formatBeijingTimestamp, getGroupColor, parseServerDate, reorderItems } from "../utils/discussion";

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

function PlayIcon() {
  return (
    <Icon>
      <path d="M7 5.5v9l7-4.5-7-4.5Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function PauseIcon() {
  return (
    <Icon>
      <path d="M7.5 5.5v9" />
      <path d="M12.5 5.5v9" />
    </Icon>
  );
}

function ResetIcon() {
  return (
    <Icon>
      <path d="M4.5 6.5A6 6 0 1 1 6.25 14" />
      <path d="M4.5 6.5V3.5" />
      <path d="M4.5 3.5h3" />
    </Icon>
  );
}

function StopIcon() {
  return (
    <Icon>
      <rect x="6" y="6" width="8" height="8" rx="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function ShareIcon() {
  return (
    <Icon>
      <path d="M6 10.5v4a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 14 14.5v-4" />
      <path d="M10 12V4.5" />
      <path d="M7 7.5 10 4.5l3 3" />
    </Icon>
  );
}

function QrIcon() {
  return (
    <Icon>
      <path d="M4 4h4v4H4z" />
      <path d="M12 4h4v4h-4z" />
      <path d="M4 12h4v4H4z" />
      <path d="M12 12h2v2h-2z" />
      <path d="M14 14h2v2h-2z" />
      <path d="M12 16h2" />
      <path d="M16 12v2" />
    </Icon>
  );
}

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

function statusLabel(discussion) {
  if (discussion.discussion_ended) {
    return "Completed";
  }
  if (discussion.timer_running) {
    return "Active";
  }
  return "Public";
}

function statusClass(discussion) {
  if (discussion.discussion_ended) {
    return "bg-slate-600 text-white";
  }
  if (discussion.timer_running) {
    return "bg-emerald-600 text-white";
  }
  return "bg-blue-600 text-white";
}

function Dialog({ open, onClose, title, children, maxWidth = "max-w-3xl" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onClick={onClose}>
      <div className={`w-full ${maxWidth} rounded-2xl border border-[color:var(--color-line)] bg-white shadow-xl`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[color:var(--color-line)] px-6 py-4">
          <h2 className="text-lg font-medium text-slate-900">{title}</h2>
          <button type="button" className="secondary-button px-3" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
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

export default function DiscussionManage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const discussionId = Number(id);
  const [user, setUser] = useState(undefined);
  const [discussion, setDiscussion] = useState(null);
  const [minutesInput, setMinutesInput] = useState(10);
  const [topicDraft, setTopicDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [topicDirty, setTopicDirty] = useState(false);
  const [isSavingTopic, setIsSavingTopic] = useState(false);
  const [pulseGroup, setPulseGroup] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [sortBy, setSortBy] = useState("time");
  const [filterGroup, setFilterGroup] = useState("all");
  const [shareItems, setShareItems] = useState([]);
  const [copiedValue, setCopiedValue] = useState("");

  useEffect(() => {
    Promise.all([getMe(), getDiscussion(discussionId)])
      .then(([meData, discussionData]) => {
        setUser(meData.user ?? null);
        setDiscussion(discussionData);
        setMinutesInput(Math.max(1, Math.ceil(discussionData.timer_duration / 60)));
        setTopicDraft(discussionData.topic);
        setTitleDraft(discussionData.title);
        setLoadError("");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setUser(null);
          return;
        }
        setUser(true);
        setLoadError(err.response?.data?.error || "Unable to load this discussion.");
      });
  }, [discussionId]);

  useSocket(discussion?.id ? String(discussion.id) : null, {
    idea_added: (idea) => {
      setDiscussion((current) => {
        if (!current) {
          return current;
        }
        const nextGroups = current.groups.includes(idea.group_id) ? current.groups : [...current.groups, idea.group_id];
        return { ...current, groups: nextGroups, ideas: mergeIdeas(current.ideas, [idea]) };
      });
      setPulseGroup(idea.group_id);
      window.setTimeout(() => setPulseGroup(""), 1000);
    },
    idea_updated: (payload) => {
      setDiscussion((current) =>
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
      setDiscussion((current) =>
        current ? { ...current, timer_running: payload.timer_running, seconds_remaining: payload.seconds_remaining } : current,
      );
    },
    session_updated: (payload) => {
      setDiscussion(payload);
      setMinutesInput(Math.max(1, Math.ceil(payload.timer_duration / 60)));
      setTitleDraft(payload.title);
      setTopicDraft((current) => (topicDirty ? current : payload.topic));
    },
    discussion_ended: () => {
      setDiscussion((current) => (current ? { ...current, discussion_ended: true, timer_running: false, seconds_remaining: 0 } : current));
    },
  });

  const ideas = discussion?.ideas || [];
  const displaySeconds = useTimer(discussion?.seconds_remaining || 0, discussion?.timer_running || false);

  const groups = useMemo(
    () =>
      (discussion?.groups || []).map((groupName) => {
        const groupIdeas = sortIdeas(ideas.filter((idea) => idea.group_id === groupName));
        const selected = (discussion?.selected_groups || []).includes(groupName);
        const active = groupIdeas.some((idea) => Date.now() - parseServerDate(idea.submitted_at).getTime() <= 2 * 60 * 1000);
        return {
          id: groupName,
          name: groupName,
          selected,
          active,
          ideas: groupIdeas,
        };
      }),
    [discussion?.groups, ideas],
  );

  const allIdeas = useMemo(
    () =>
      groups.flatMap((group) =>
        group.ideas.map((idea) => ({
          ...idea,
          groupName: group.name,
          groupId: group.id,
          groupSelected: group.selected,
          active: group.active,
          groupColor: getGroupColor(group.name),
        })),
      ),
    [groups],
  );

  const selectedEntities = useMemo(() => {
    const items = [];
    groups.forEach((group) => {
      if (group.selected) {
        items.push({
          id: `group:${group.id}`,
          type: "group",
          name: group.name,
          groupId: group.id,
          ideaIds: group.ideas.map((idea) => idea.id),
          sortOrder: Math.min(...group.ideas.map((idea) => idea.share_order ?? Number.MAX_SAFE_INTEGER)),
        });
      } else {
        group.ideas.forEach((idea) => {
          if (idea.is_selected) {
            items.push({
              id: `idea:${idea.id}`,
              type: "idea",
              name: `${group.name} - ${idea.content.slice(0, 50)}${idea.content.length > 50 ? "..." : ""}`,
              groupId: group.id,
              ideaIds: [idea.id],
              sortOrder: idea.share_order ?? Number.MAX_SAFE_INTEGER,
            });
          }
        });
      }
    });
    return items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [groups]);

  useEffect(() => {
    if (!showShareDialog) {
      setShareItems((current) => {
        if (
          current.length === selectedEntities.length &&
          current.every((item, index) => item.id === selectedEntities[index]?.id)
        ) {
          return current;
        }
        return selectedEntities;
      });
    }
  }, [selectedEntities, showShareDialog]);

  const sortedFilteredIdeas = useMemo(() => {
    let nextIdeas = [...allIdeas];
    if (filterGroup !== "all") {
      nextIdeas = nextIdeas.filter((idea) => idea.groupId === filterGroup);
    }
    if (sortBy === "group") {
      nextIdeas.sort((a, b) => a.groupName.localeCompare(b.groupName) || parseServerDate(b.submitted_at) - parseServerDate(a.submitted_at));
    } else {
      nextIdeas.sort((a, b) => parseServerDate(b.submitted_at) - parseServerDate(a.submitted_at));
    }
    return nextIdeas;
  }, [allIdeas, filterGroup, sortBy]);

  async function patchDiscussion(payload) {
    try {
      setActionError("");
      const data = await updateDiscussion(discussionId, payload);
      setDiscussion(data);
      setTitleDraft(data.title);
      setTopicDraft(data.topic);
      setTopicDirty(false);
      return data;
    } catch (err) {
      setActionError(err.response?.data?.error || "Unable to update this discussion.");
      throw err;
    }
  }

  async function handleTimerPrimaryAction() {
    if (discussion.timer_running) {
      await patchDiscussion({ timer_running: false });
      return;
    }
    await patchDiscussion({ timer_running: true });
  }

  async function handleTimerReset() {
    await patchDiscussion({ reset_timer: true, timer_duration: Math.max(1, minutesInput) * 60 });
  }

  async function handleDurationSave() {
    await patchDiscussion({ timer_duration: Math.max(1, minutesInput) * 60 });
  }

  async function handleTopicSave() {
    if (!topicDraft.trim() || !titleDraft.trim()) {
      return;
    }
    setIsSavingTopic(true);
    try {
      await patchDiscussion({ title: titleDraft.trim(), topic: topicDraft.trim() });
    } finally {
      setIsSavingTopic(false);
    }
  }

  async function handleEndDiscussion() {
    if (!window.confirm("This will reveal selected ideas to all students. Continue?")) {
      return;
    }
    await patchDiscussion({ discussion_ended: true });
  }

  async function handleResumeDiscussion() {
    await patchDiscussion({ resume_discussion: true, timer_duration: Math.max(1, minutesInput) * 60 });
  }

  async function handleRestartDiscussion() {
    await patchDiscussion({ restart_discussion: true, timer_duration: Math.max(1, minutesInput) * 60 });
  }

  async function handleToggleGroupSelection(group) {
    try {
      setActionError("");
      const data = await updateDiscussionGroupSelection(discussionId, {
        group_id: group.id,
        is_selected: !group.selected,
      });
      setDiscussion(data);
    } catch (err) {
      setActionError(err.response?.data?.error || "Unable to update this group.");
    }
  }

  async function handleToggleIdeaSelection(idea) {
    await updateIdea(idea.id, { is_selected: !idea.is_selected, share_order: idea.is_selected ? null : idea.share_order });
  }

  function handleChangeSharePosition(itemId, nextPosition) {
    setShareItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === itemId);
      const toIndex = Number(nextPosition) - 1;
      if (fromIndex === -1 || toIndex < 0 || toIndex >= current.length || fromIndex === toIndex) {
        return current;
      }
      return reorderItems(current, fromIndex, toIndex);
    });
  }

  async function saveShareOrder() {
    let order = 1;
    for (const item of shareItems) {
      const group = groups.find((entry) => entry.id === item.groupId);
      const orderedIdeaIds =
        item.type === "group"
          ? (group?.ideas || []).map((idea) => idea.id)
          : item.ideaIds;

      for (const ideaId of orderedIdeaIds) {
        await updateIdea(ideaId, { is_selected: true, share_order: order });
        order += 1;
      }
    }
    setShowShareDialog(false);
  }

  async function copyToClipboard(text) {
    try {
      await copyText(text);
      setCopiedValue(text);
      window.setTimeout(() => {
        setCopiedValue((current) => (current === text ? "" : current));
      }, 1400);
    } catch {
      setActionError("Unable to copy on this browser.");
    }
  }

  if (user === undefined || (!discussion && !loadError)) {
    return <main className="page-loading">Loading discussion...</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loadError) {
    return (
      <main className="min-h-screen px-5 py-10 md:px-8">
        <div className="mx-auto max-w-2xl rounded-[24px] border border-red-200 bg-red-50 px-6 py-6 text-red-700">
          <p className="text-lg font-semibold">Unable to open this discussion</p>
          <p className="mt-2 text-sm">{loadError}</p>
          <button type="button" className="secondary-button mt-4" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
        </div>
      </main>
    );
  }

  const joinUrl = `${window.location.origin}/join/${discussion.join_token}`;
  const totalSelected = shareItems.length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <section className="mb-6 rounded-2xl border border-[color:var(--color-line)] bg-white p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button type="button" className="secondary-button gap-2 px-3" onClick={() => navigate("/dashboard")}>
                <BackIcon />
                <span>Back</span>
              </button>
              <div className="min-w-0">
                <p className="eyebrow">Discussion Workspace</p>
                <h1 className="truncate text-2xl font-medium text-slate-900 md:text-[28px]">{discussion.title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="secondary-button gap-2" onClick={() => setShowJoinDialog(true)}>
                <QrIcon />
                <span>Join Info</span>
              </button>
              <button type="button" className="secondary-button" onClick={() => navigate(`/discussions/${discussionId}/share`)}>
                Share View
              </button>
              <button type="button" className="secondary-button" onClick={() => setShowEditDialog(true)}>
                Edit discussion
              </button>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass(discussion)}`}>{statusLabel(discussion)}</span>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-[color:var(--color-line)] bg-slate-50 p-5">
            <p className="text-base leading-7 text-slate-700 whitespace-pre-wrap">{discussion.topic}</p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-3xl font-mono text-slate-900">
              <Timer seconds={displaySeconds} running={discussion.timer_running} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {discussion.discussion_ended ? (
                <>
                  <button type="button" className="primary-button gap-2 px-4" onClick={handleResumeDiscussion}>
                    <PlayIcon />
                    <span>Continue</span>
                  </button>
                  <button type="button" className="secondary-button gap-2 px-4" onClick={handleRestartDiscussion}>
                    <ResetIcon />
                    <span>Restart</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`inline-flex h-10 min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium text-white transition ${
                      discussion.timer_running ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-900 hover:bg-slate-800"
                    }`}
                    onClick={handleTimerPrimaryAction}
                  >
                    {discussion.timer_running ? <PauseIcon /> : <PlayIcon />}
                    <span>{discussion.timer_running ? "Pause" : "Start"}</span>
                  </button>
                  <button type="button" className="secondary-button gap-2 px-4" onClick={handleTimerReset}>
                    <ResetIcon />
                    <span>Reset</span>
                  </button>
                  <button type="button" className="danger-button gap-2 px-4" onClick={handleEndDiscussion}>
                    <StopIcon />
                    <span>End</span>
                  </button>
                </>
              )}
              <label className="ml-2 flex items-center gap-2 text-sm text-slate-600">
                <span>Duration</span>
                <input
                  type="number"
                  min="1"
                  className="soft-input w-24"
                  value={minutesInput}
                  disabled={discussion.timer_running}
                  onChange={(event) => setMinutesInput(Number(event.target.value) || 1)}
                  onBlur={handleDurationSave}
                />
              </label>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <section className="glass-panel p-4">
              <h2 className="mb-4 flex items-center gap-2 text-lg text-slate-900">Groups Overview</h2>
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`rounded-lg border p-3 transition-all ${
                      group.selected
                        ? "border-slate-400 bg-slate-100"
                        : pulseGroup === group.id
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-slate-900"
                        checked={group.selected}
                        onChange={() => handleToggleGroupSelection(group)}
                      />
                      <div className={`h-3 w-3 rounded-full ${getGroupColor(group.name)}`} />
                      <span className="flex-1 text-slate-900">{group.name}</span>
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{group.ideas.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel mt-4 p-4">
              <h2 className="mb-4 flex items-center gap-2 text-lg text-slate-900">
                <ShareIcon />
                <span>Selected for Sharing ({totalSelected})</span>
              </h2>
              <div className="mb-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {shareItems.length === 0 ? <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No groups or ideas selected yet.</p> : null}
                {shareItems.map((item, index) => (
                  <div key={item.id} className="rounded border border-slate-200 bg-slate-100 p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">#{index + 1}</span>
                      <span className="line-clamp-1 text-slate-700">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="primary-button w-full gap-2" onClick={() => setShowShareDialog(true)}>
                <ShareIcon />
                <span>Manage Sharing Order</span>
              </button>
            </section>
          </div>

          <div className="lg:col-span-2">
            <section className="glass-panel p-4">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg text-slate-900">Group Ideas ({allIdeas.length})</h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select className="soft-input w-full sm:w-[160px]" value={filterGroup} onChange={(event) => setFilterGroup(event.target.value)}>
                    <option value="all">All Groups</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="secondary-button" onClick={() => setSortBy(sortBy === "time" ? "group" : "time")}>
                    {sortBy === "time" ? "By Time" : "By Group"}
                  </button>
                </div>
              </div>

              {actionError ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p> : null}

              <div className="space-y-3">
                {sortedFilteredIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className={`rounded-lg border p-4 transition-all ${
                      idea.is_selected || idea.groupSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-slate-900"
                        checked={idea.is_selected || idea.groupSelected}
                        disabled={idea.groupSelected}
                        onChange={() => handleToggleIdeaSelection(idea)}
                      />
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${idea.groupColor}`} />
                          <span className="text-sm text-slate-900">{idea.groupName}</span>
                          <span className="text-xs text-slate-500">{formatBeijingTimestamp(idea.submitted_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-700">{idea.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedFilteredIdeas.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No ideas match the current filter.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onClose={() => !isSavingTopic && setShowEditDialog(false)} title="Edit discussion">
        {actionError ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p> : null}
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Discussion title</span>
            <input className="soft-input" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Discussion topic (Markdown supported)</span>
            <div data-color-mode="light" className="overflow-hidden rounded-xl border border-[color:var(--color-line)] bg-white">
              <MDEditor
                value={topicDraft}
                onChange={(value) => {
                  setTopicDraft(value || "");
                  setTopicDirty(true);
                }}
                preview="edit"
                height={320}
                visibleDragbar={false}
              />
            </div>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setTopicDraft(discussion.topic);
                setTitleDraft(discussion.title);
                setTopicDirty(false);
                setShowEditDialog(false);
              }}
              disabled={isSavingTopic}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={async () => {
                await handleTopicSave();
                setShowEditDialog(false);
              }}
              disabled={isSavingTopic || !topicDraft.trim() || !titleDraft.trim()}
            >
              {isSavingTopic ? "Updating..." : "Save changes"}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)} title="Manage Sharing Order" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Arrange the order in which groups and ideas will be shared during presentation.</p>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {shareItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="font-mono text-sm text-slate-500">#{index + 1}</span>
                <span className="flex-1 text-slate-900">{item.name}</span>
                <select
                  className="soft-input w-24"
                  value={index + 1}
                  onChange={(event) => handleChangeSharePosition(item.id, event.target.value)}
                >
                  {shareItems.map((_, optionIndex) => (
                    <option key={optionIndex + 1} value={optionIndex + 1}>
                      {optionIndex + 1}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="secondary-button" onClick={() => setShowShareDialog(false)}>Close</button>
            <button type="button" className="primary-button" onClick={saveShareOrder}>Save Order</button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)} title="Student Join Information" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Join Code</label>
            <div className="flex gap-2">
              <input readOnly className="soft-input font-mono text-lg" value={discussion.join_token} />
              <button type="button" className="secondary-button" onClick={() => copyToClipboard(discussion.join_token)}>
                {copiedValue === discussion.join_token ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Join URL</label>
            <div className="flex gap-2">
              <input readOnly className="soft-input text-sm" value={joinUrl} />
              <button type="button" className="secondary-button px-3" onClick={() => copyToClipboard(joinUrl)}>
                {copiedValue === joinUrl ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">QR Code</label>
            <div className="flex justify-center rounded-lg border-2 border-slate-200 bg-white p-6">
              <QRCodeSVG value={joinUrl} size={180} level="H" includeMargin />
            </div>
          </div>
        </div>
      </Dialog>
    </main>
  );
}
