/**
 * Profile-specific skeleton / loading placeholders.
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

/**
 * Skeleton for a membership card row (active membership).
 */
export function SkeletonMembership() {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-4 w-14 rounded-full" />
        </div>
        <Shimmer className="h-5 w-20" />
        <Shimmer className="h-3 w-44" />
      </div>
      <Shimmer className="shrink-0 h-7 w-16 rounded-full" />
    </div>
  );
}

/**
 * Skeleton for the "Saved card" billing section.
 */
export function SkeletonBillingCard() {
  return (
    <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
        <Shimmer className="h-4 w-44" />
        <div className="flex gap-2">
          <Shimmer className="h-6 w-20 rounded-full" />
          <Shimmer className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the billing / transaction table.
 * @param {number} rows - number of table row shimmer lines
 */
export function SkeletonTransactionRows({ rows = 5 }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-700 overflow-hidden">
      {/* thead shimmer */}
      <div className="flex gap-3 bg-slate-900/80 px-3 py-2">
        <Shimmer className="h-3 w-14" />
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-3 w-14" />
      </div>
      {/* tbody rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-t border-slate-800 px-3 py-2.5"
        >
          <Shimmer className="h-3 w-16 shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Shimmer className="h-3.5 w-36" />
            <Shimmer className="h-2.5 w-24" />
          </div>
          <Shimmer className="h-3.5 w-14 shrink-0" />
          <Shimmer className="h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
