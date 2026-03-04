import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { CURRENT_USER } from "../apollo/queries";
import { useToast } from "../components/ToastProvider";
import InstructorPayoutsModule from "../components/InstructorPayoutsModule";
import { useAuth } from "../auth/AuthProvider";

export default function InstructorPayoutsPage() {
  useDocumentTitle("Payouts");
  const auth = useAuth();
  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;
  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";
  const isOwner = isGodmode || roleName === "owner" || user?.role === 0;
  const isModerator = isGodmode || roleName === "moderator" || user?.role === 4;
  const { addToast } = useToast();

  if (userLoading || (!user && !userLoading)) {
    return <div className="text-sm text-slate-300">Loading account…</div>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  if (isGodmode && !auth.isImpersonating) {
    return <Navigate to="/owner" replace />;
  }

  if (!isOwner && !isModerator) {
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

      <InstructorPayoutsModule addToast={addToast} />
    </div>
  );
}
