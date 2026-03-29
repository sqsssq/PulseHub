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
    <div className={`inline-flex min-w-24 flex-col items-center gap-0.5 rounded-md border border-[color:var(--color-line)] bg-white px-3 py-2 ${running ? "" : "opacity-85"}`}>
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
        {running ? "Live" : "Paused"}
      </span>
      <span className={`text-base font-medium tabular-nums ${valueClass}`}>{formatSeconds(seconds)}</span>
    </div>
  );
}
