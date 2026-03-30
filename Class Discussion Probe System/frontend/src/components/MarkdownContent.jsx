import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const baseComponents = {
  h1: ({ children }) => <h1 className="mt-4 text-2xl font-semibold leading-tight text-slate-900 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 text-xl font-semibold leading-tight text-slate-900 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-lg font-semibold leading-tight text-slate-900 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mt-3 leading-7 text-slate-700 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700 first:mt-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.95em] text-slate-800">{children}</code>
    ) : (
      <code className="block overflow-x-auto rounded-2xl bg-slate-950/95 p-4 text-sm leading-6 text-slate-100">{children}</code>
    ),
  pre: ({ children }) => <pre className="mt-3 overflow-x-auto first:mt-0">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-4 border-[color:var(--color-brand)]/35 pl-4 italic text-slate-600 first:mt-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a className="text-[color:var(--color-brand)] underline decoration-[color:var(--color-brand)]/35 underline-offset-4" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ""}
      className="mt-4 max-h-96 w-auto max-w-full rounded-2xl border border-slate-200 bg-slate-50 object-contain first:mt-0"
    />
  ),
};

export default function MarkdownContent({ content, className = "", variant = "body" }) {
  const variantClass =
    variant === "topic"
      ? "font-[var(--font-display)] text-2xl leading-9 text-slate-800 md:text-[2rem] md:leading-10"
      : "text-base";

  return (
    <div className={`${variantClass} ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={baseComponents}>
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
