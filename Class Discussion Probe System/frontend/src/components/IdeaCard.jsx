import { useState } from "react";
import MarkdownContent from "./MarkdownContent";
import { timeAgoBeijing } from "../utils/discussion";

export default function IdeaCard({ idea, selected = false, controls, compact = false }) {
  const attachments = idea.attachments || [];
  const images = attachments.filter((attachment) => attachment.kind === "image");
  const documents = attachments.filter((attachment) => attachment.kind !== "image");
  const [previewAttachment, setPreviewAttachment] = useState(null);

  function closePreview() {
    setPreviewAttachment(null);
  }

  return (
    <>
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
              <button
                key={attachment.url}
                type="button"
                className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left transition hover:border-slate-300"
                onClick={() => setPreviewAttachment(attachment)}
              >
                <img src={attachment.url} alt={attachment.name} className="h-44 w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
        {documents.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            {documents.map((attachment) => (
              <button
                key={attachment.url}
                type="button"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setPreviewAttachment(attachment)}
              >
                <span className="truncate font-medium">{attachment.name}</span>
                <span className="ml-3 shrink-0 text-xs uppercase tracking-wide text-slate-500">{attachment.extension}</span>
              </button>
            ))}
          </div>
        ) : null}
        {controls ? <div className="mt-4 flex flex-col gap-2">{controls}</div> : null}
      </article>

      {previewAttachment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={closePreview}>
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{previewAttachment.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{previewAttachment.extension}</p>
              </div>
              <div className="flex items-center gap-3">
                <a className="secondary-button px-3" href={previewAttachment.url} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button type="button" className="secondary-button px-3" onClick={closePreview}>
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
              {previewAttachment.kind === "image" ? (
                <div className="flex min-h-[50vh] items-center justify-center">
                  <img src={previewAttachment.url} alt={previewAttachment.name} className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-sm" />
                </div>
              ) : previewAttachment.extension === "pdf" ? (
                <iframe title={previewAttachment.name} src={previewAttachment.url} className="h-[75vh] w-full rounded-2xl border border-slate-200 bg-white" />
              ) : (
                <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="text-lg font-semibold text-slate-900">Preview is not available in-browser for this file type.</p>
                  <p className="mt-2 max-w-md text-sm text-slate-600">DOCX and PPTX are attached successfully, but they still need to be opened in a separate tab or downloaded in the browser.</p>
                  <a className="primary-button mt-5" href={previewAttachment.url} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
