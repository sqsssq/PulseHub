import MarkdownContent from "./MarkdownContent";

export default function TopicBanner({ topic, collapsed = false, meta }) {
  return (
    <header
      className={`sticky top-0 z-30 mb-5 flex flex-col gap-4 rounded-b-[24px] border border-white/30 bg-white/75 px-5 backdrop-blur-xl shadow-[0_10px_30px_rgba(29,42,72,0.08)] md:flex-row md:items-center md:justify-between md:px-6 ${
        collapsed ? "py-3" : "py-4"
      }`}
    >
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">Discussion Topic</p>
        <MarkdownContent
          content={topic}
          className="[&_p]:mt-0 [&_p]:font-[var(--font-display)] [&_p]:text-[clamp(1.6rem,2.4vw,2.7rem)] [&_p]:leading-[1.04] [&_p]:tracking-[-0.03em] [&_p]:text-slate-900 [&_h1]:mt-0 [&_h1]:font-[var(--font-display)] [&_h1]:text-[clamp(1.6rem,2.4vw,2.7rem)] [&_h1]:leading-[1.04] [&_h1]:tracking-[-0.03em] [&_h1]:text-slate-900 [&_h2]:mt-0 [&_h2]:font-[var(--font-display)] [&_h2]:text-[clamp(1.4rem,2.1vw,2.3rem)] [&_h2]:leading-[1.08] [&_h2]:tracking-[-0.03em] [&_h2]:text-slate-900"
        />
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </header>
  );
}
