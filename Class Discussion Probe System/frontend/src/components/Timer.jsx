function formatSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function Timer({ seconds, running }) {
  let valueClass = "text-slate-900";
  if (seconds <= 60) {
    valueClass = "text-[color:var(--color-danger)]";
  } else if (seconds <= 120) {
    valueClass = "text-amber-500";
  }

  return (
    <div className={`inline-flex min-w-28 flex-col items-center gap-0.5 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] ${running ? "" : "opacity-85"}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
        {running ? "Live" : "Paused"}
      </span>
      <span className={`text-lg font-extrabold tabular-nums ${valueClass}`}>{formatSeconds(seconds)}</span>
    </div>
  );
}
