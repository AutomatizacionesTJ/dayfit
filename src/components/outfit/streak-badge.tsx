export function StreakBadge({ streak, max, size = "md" }: { streak: number; max?: number; size?: "md" | "lg" }) {
  const active = streak > 0;
  return (
    <div className="flex items-end gap-3">
      <div
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ${active ? "bg-flame/12 text-flame" : "bg-muted text-fg-soft"}`}
        title={active ? `${streak} días seguidos` : "Sin racha activa"}
      >
        <span className={size === "lg" ? "text-2xl" : "text-lg"} aria-hidden>
          🔥
        </span>
        <span className={`font-semibold tabular-nums ${size === "lg" ? "text-2xl" : "text-lg"}`}>{streak}</span>
        <span className="sr-only">días de racha</span>
      </div>
      {max !== undefined && max > 0 && (
        <span className="pb-1.5 text-xs text-fg-soft">Máxima: {max}</span>
      )}
    </div>
  );
}
