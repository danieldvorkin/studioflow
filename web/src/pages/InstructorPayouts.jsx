import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { CURRENT_USER, STUDIOS } from "../apollo/queries";
import { useToast } from "../components/ToastProvider";
import InstructorPayoutsModule from "../components/InstructorPayoutsModule";
import { useState } from "react";

export default function InstructorPayoutsPage() {
  useDocumentTitle("Payouts");
  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;
  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";
  const isOwner = roleName === "owner" || user?.role === 0;
  const isModerator = roleName === "moderator" || user?.role === 4;
  const { addToast } = useToast();

  const [selectedStudioId, setSelectedStudioId] = useState("");

  const { data: studiosData } = useQuery(STUDIOS, { skip: !isGodmode });
  const studios = studiosData?.studios || [];

  if (userLoading || (!user && !userLoading)) {
    return <div className="text-sm text-slate-300">Loading account…</div>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  if (!isGodmode && !isOwner && !isModerator) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">
          Owner access only
        </h1>
        <p className="text-sm text-slate-400">
          Only the studio owner or moderators can manage instructor payouts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Instructor payouts
        </h1>
        <p className="text-sm text-slate-400">
          Review weekly earnings, manage compensation rules, and pay out via
          Stripe Connect.
        </p>
      </header>

      {isGodmode && studios.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-400">Studio</label>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            value={selectedStudioId}
            onChange={(e) => setSelectedStudioId(e.target.value)}
          >
            <option value="">All studios</option>
            {[...studios]
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <InstructorPayoutsModule
        addToast={addToast}
        studioId={selectedStudioId || null}
      />
    </div>
  );
}
