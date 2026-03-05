/**
 * SuccessOverlay
 *
 * Shows a full-screen animated overlay:
 *   - `status="loading"` → spinning ring
 *   - `status="success"` → green circle with animated checkmark
 *   - `status="error"`   → red circle with ✕
 *
 * Props:
 *   status  — "loading" | "success" | "error"
 *   message — optional caption shown under the icon
 */
export default function SuccessOverlay({ status, message }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-slate-700 border-t-sky-400 animate-spin" />
          <p className="text-sm text-slate-300">{message || "Processing…"}</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.5)] animate-[pop_0.35s_ease-out]">
            <svg
              className="h-10 w-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: 0,
                animation: "draw 0.4s 0.1s ease-out both",
              }}
            >
              <style>{`
                @keyframes draw {
                  from { stroke-dashoffset: 30; }
                  to   { stroke-dashoffset: 0;  }
                }
                @keyframes pop {
                  0%   { transform: scale(0.5); opacity: 0; }
                  70%  { transform: scale(1.1); opacity: 1; }
                  100% { transform: scale(1);   opacity: 1; }
                }
              `}</style>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-base font-semibold text-emerald-300">
            {message || "Order confirmed!"}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500">
            <svg
              className="h-10 w-10 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-rose-300">
            {message || "Something went wrong"}
          </p>
        </div>
      )}
    </div>
  );
}
