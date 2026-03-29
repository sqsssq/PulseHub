import MarkdownContent from "./MarkdownContent";
import { timeAgoBeijing } from "../utils/discussion";

export default function IdeaCard({ idea, selected = false, controls, compact = false }) {
  return (
    <article
      className={`rounded-xl border px-4 py-4 transition ${
        selected
          ? "border-slate-300 bg-slate-50"
          : "border-[color:var(--color-line)] bg-white"
      } ${compact ? "p-3" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <strong className="text-slate-800">{idea.author_name || "Anonymous"}</strong>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-[color:var(--color-muted)]">{timeAgoBeijing(idea.submitted_at)}</span>
      </div>
      <MarkdownContent content={idea.content} className="mt-3" />
      {controls ? <div className="mt-4 flex flex-col gap-2">{controls}</div> : null}
    </article>
  );
}
