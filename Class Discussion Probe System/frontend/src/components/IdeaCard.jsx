import MarkdownContent from "./MarkdownContent";
import { timeAgoBeijing } from "../utils/discussion";

export default function IdeaCard({ idea, selected = false, controls, compact = false }) {
  const attachments = idea.attachments || [];
  const images = attachments.filter((attachment) => attachment.kind === "image");
  const documents = attachments.filter((attachment) => attachment.kind !== "image");

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
      {images.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {images.map((attachment) => (
            <a
              key={attachment.url}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img src={attachment.url} alt={attachment.name} className="h-44 w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {documents.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {documents.map((attachment) => (
            <a
              key={attachment.url}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <span className="truncate font-medium">{attachment.name}</span>
              <span className="ml-3 shrink-0 text-xs uppercase tracking-wide text-slate-500">{attachment.extension}</span>
            </a>
          ))}
        </div>
      ) : null}
      {controls ? <div className="mt-4 flex flex-col gap-2">{controls}</div> : null}
    </article>
  );
}
