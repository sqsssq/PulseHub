import MarkdownContent from "./MarkdownContent";

export default function TopicBanner({ topic, collapsed = false, meta }) {
  return (
    <header
      className={`sticky top-0 z-30 mb-5 flex flex-col gap-4 border-b border-[color:var(--color-line)] bg-white px-5 md:flex-row md:items-center md:justify-between md:px-6 ${
        collapsed ? "py-3" : "py-4"
      }`}
    >
      <div className="min-w-0">
        <MarkdownContent
          content={topic}
          className="[&_p]:mt-0 [&_p]:text-[clamp(1.25rem,1.9vw,1.75rem)] [&_p]:font-medium [&_p]:leading-tight [&_p]:text-slate-900 [&_h1]:mt-0 [&_h1]:text-[clamp(1.25rem,1.9vw,1.75rem)] [&_h1]:font-medium [&_h1]:leading-tight [&_h1]:text-slate-900 [&_h2]:mt-0 [&_h2]:text-[clamp(1.15rem,1.6vw,1.5rem)] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:text-slate-900"
        />
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </header>
  );
}
