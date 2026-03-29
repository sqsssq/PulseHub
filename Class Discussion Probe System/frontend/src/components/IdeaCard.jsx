import MarkdownContent from "./MarkdownContent";

function timeAgo(input) {
  const delta = Math.max(0, Math.floor((Date.now() - new Date(input).getTime()) / 60000));
  if (delta < 1) {
    return "Just now";
  }
  if (delta === 1) {
    return "1 min ago";
  }
  return `${delta} min ago`;
}

export default function IdeaCard({ idea, selected = false, controls, compact = false }) {
  return (
    <article
      className={`rounded-3xl border px-4 py-4 shadow-[0_10px_24px_rgba(39,49,76,0.06)] transition ${
        selected
          ? "border-[color:var(--color-brand)]/15 bg-[linear-gradient(180deg,rgba(238,237,254,0.98),rgba(246,244,255,0.94))]"
          : "border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,252,255,0.92))]"
      } ${compact ? "p-3" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <strong className="text-slate-800">{idea.author_name || "Anonymous"}</strong>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-[color:var(--color-muted)]">{timeAgo(idea.submitted_at)}</span>
      </div>
      <MarkdownContent content={idea.content} className="mt-3" />
      {controls ? <div className="mt-4 flex flex-col gap-2">{controls}</div> : null}
    </article>
  );
}
