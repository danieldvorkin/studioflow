/**
 * Dashboard-specific skeleton / loading placeholders.
 *
 * Shimmer moves left→right with a white-light sweep on a muted background,
 * matching the dark app palette.
 */

function Shimmer({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-slate-700/60 ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          animation: "shimmer 1.1s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/** Matches <StatCard /> */
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5">
      <Shimmer className="h-3 w-24 mb-3" />
      <Shimmer className="h-7 w-20 mb-2" />
      <Shimmer className="h-2.5 w-32" />
    </div>
  );
}

/** Matches <StatRow /> */
export function SkeletonStatRow() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5">
      <div className="min-w-0 flex flex-col gap-2 flex-1">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-3 w-28" />
      </div>
      <Shimmer className="shrink-0 h-4 w-14" />
    </div>
  );
}

/**
 * Main dashboard panel skeleton: stat card grid + row list.
 * @param {number} cards
 * @param {number} rows
 */
export function SkeletonDashboardPanel({ cards = 3, rows = 5 }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`grid gap-3 ${
          cards === 2
            ? "grid-cols-2"
            : cards === 4
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-1 md:grid-cols-3"
        }`}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      {rows > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonStatRow key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Sidebar column of rows */
export function SkeletonSidePanel({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonStatRow key={i} />
      ))}
    </div>
  );
}
