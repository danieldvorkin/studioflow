/**
 * Spinner – minimal visible loader.
 *
 * Usage:
 *   <Spinner />                     // centred, full-page (default for Suspense fallback)
 *   <Spinner size="sm" inline />    // inline / section-level
 */
export default function Spinner({
  size = "md",
  inline = false,
  label = "Loading…",
}) {
  const dim =
    size === "sm"
      ? "h-6 w-6 border-2"
      : size === "lg"
        ? "h-14 w-14 border-[4px]"
        : "h-9 w-9 border-[3px]";

  const ring = (
    <span
      aria-hidden="true"
      className={`block animate-spin rounded-full border-slate-600 border-t-sky-400 ${dim}`}
      style={{ animationDuration: "550ms" }}
    />
  );

  if (inline) {
    return (
      <span
        role="status"
        aria-label={label}
        className="inline-flex items-center gap-2"
      >
        {ring}
        <span className="text-xs text-slate-400">{label}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col items-center justify-center gap-4 py-16"
    >
      {ring}
      <span className="text-xs tracking-widest text-slate-400 uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * Full-page Suspense fallback — centres the spinner in the main content area.
 */
export function PageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center">
      <Spinner size="lg" label="Loading dashboard…" />
    </div>
  );
}
