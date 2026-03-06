import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useAuth } from "../auth/AuthProvider";
import { STUDIOS, ALL_USERS, STUDIO_SUBSCRIPTIONS } from "../apollo/queries";

const TIER_COLORS = {
  premium: "border-purple-700/60 bg-purple-950/30 text-purple-300",
  basic: "border-sky-700/60 bg-sky-950/30 text-sky-300",
};
const STATUS_COLORS = {
  active: "border-emerald-700/60 bg-emerald-950/30 text-emerald-300",
  trialing: "border-sky-700/60 bg-sky-950/30 text-sky-300",
  past_due: "border-amber-700/60 bg-amber-950/30 text-amber-300",
  cancelled: "border-rose-700/60 bg-rose-950/30 text-rose-300",
  suspended: "border-slate-600 bg-slate-900 text-slate-400",
};

function Badge({ label, colorClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default function GodmodeStudios() {
  const { user, isImpersonating } = useAuth();

  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";
  const isModerator = roleName === "moderator" || user?.role === 4;
  const isPlatformStaff = isGodmode || isModerator;

  const { data: studiosData, loading: studiosLoading } = useQuery(STUDIOS, {
    fetchPolicy: "cache-and-network",
    skip: !isPlatformStaff,
  });

  const { data: usersData, loading: usersLoading } = useQuery(ALL_USERS, {
    fetchPolicy: "cache-and-network",
    skip: !isPlatformStaff,
  });

  const { data: subsData, loading: subsLoading } = useQuery(
    STUDIO_SUBSCRIPTIONS,
    {
      fetchPolicy: "cache-and-network",
      skip: !isPlatformStaff,
    },
  );

  const loading = studiosLoading || usersLoading || subsLoading;

  const studios = useMemo(() => {
    const all = studiosData?.studios || [];
    const allUsers = usersData?.users || [];
    const allSubs = subsData?.studioSubscriptions || [];

    return all.map((studio) => {
      const sid = (studio.id || "").toString();
      const studioUsers = allUsers.filter(
        (u) => (u?.studioId || "").toString() === sid,
      );
      const sub = allSubs.find(
        (s) => (s?.studioId || s?.studio?.id || "").toString() === sid,
      );

      const clientCount = studioUsers.filter(
        (u) => u?.roleName === "client" || u?.role === 3,
      ).length;
      const staffCount = studioUsers.filter((u) => {
        const rn = (u?.roleName || "").toString().toLowerCase();
        return (
          rn === "owner" ||
          rn === "staff" ||
          rn === "instructor" ||
          u?.role === 0 ||
          u?.role === 1 ||
          u?.role === 2
        );
      }).length;

      return { ...studio, sub, clientCount, staffCount };
    });
  }, [studiosData, usersData, subsData]);

  if (!user) return <Navigate to="/signin" replace />;
  if (!isPlatformStaff || isImpersonating)
    return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Studios
          </h1>
          <span className="rounded-full border border-violet-700/60 bg-violet-950/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-violet-400">
            Godmode
          </span>
          {loading && <span className="text-xs text-slate-500">Loading…</span>}
        </div>
        <p className="text-sm text-slate-400">
          All studios on the platform — {loading ? "…" : studios.length} total.
        </p>
      </header>

      {!loading && studios.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
          No studios found.
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-slate-900"
            />
          ))}
        </div>
      )}

      {!loading && studios.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {studios.map((studio) => {
            const tier = studio.sub?.tier;
            const status = studio.sub?.status;
            const locations = studio.studioLocations || [];

            return (
              <Link
                key={studio.id}
                to={`/godmode/studios/${studio.id}`}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm shadow-black/20 transition hover:border-sky-500/50 hover:bg-slate-900/90"
              >
                {/* Studio identity */}
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-fuchsia-500 text-base font-bold text-white">
                    {studio.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-100 group-hover:text-white">
                      {studio.name}
                    </div>
                    {locations.length > 0 && (
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">
                        {locations.map((l) => l.name).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscription badges */}
                <div className="flex flex-wrap gap-1.5">
                  {tier ? (
                    <Badge
                      label={tier}
                      colorClass={TIER_COLORS[tier] || TIER_COLORS.basic}
                    />
                  ) : (
                    <Badge
                      label="no plan"
                      colorClass="border-slate-600 bg-slate-900 text-slate-500"
                    />
                  )}
                  {status && (
                    <Badge
                      label={status.replace("_", " ")}
                      colorClass={
                        STATUS_COLORS[status] || STATUS_COLORS.suspended
                      }
                    />
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-xs">
                  <div>
                    <div className="text-slate-500">Clients</div>
                    <div className="mt-0.5 font-semibold text-slate-200">
                      {studio.clientCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Staff / Instructor</div>
                    <div className="mt-0.5 font-semibold text-slate-200">
                      {studio.staffCount}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-sky-400 group-hover:text-sky-300">
                  View details →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
