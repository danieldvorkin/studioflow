import { useMutation, useQuery } from "@apollo/client";
import { useParams, Link } from "react-router-dom";
import {
  CLASS_SESSIONS,
  CLASS_TEMPLATES,
  MY_BOOKINGS,
  MY_FAVORITE_CLASS_SESSIONS,
} from "../../../apollo/queries";
import {
  UPDATE_CLASS_SESSION,
  DELETE_CLASS_SESSION,
  TOGGLE_FAVORITE_CLASS_SESSION,
} from "../../../apollo/mutations";
import { useToast } from "../../../components/shared/ToastProvider";
import { useAuth } from "../../../auth/AuthProvider";
import {
  canDeleteSessions,
  canEditSession,
  isOwner,
  isStaff,
  isGodmode,
} from "../../../auth/permissions";
import { useStudio } from "../../../studio/StudioProvider";
import { useCurrency } from "../../../currency/CurrencyProvider";

export default function Sessions() {
  const { id } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isClientUser = roleName === "client";
  const canManageSession = isGodmode(user) || isOwner(user) || isStaff(user);
  const { selectedStudioId } = useStudio();
  const canFavorite = isClientUser && !!selectedStudioId;

  const { data: myBookingsData } = useQuery(MY_BOOKINGS, {
    skip: !isClientUser,
    variables: selectedStudioId ? { studioId: selectedStudioId } : {},
  });
  const { data, loading, error } = useQuery(CLASS_SESSIONS, {
    variables: isClientUser
      ? selectedStudioId
        ? { from: null, to: null, studioId: selectedStudioId }
        : { from: null, to: null }
      : { from: null, to: null },
  });

  const { data: templatesData } = useQuery(CLASS_TEMPLATES, {
    variables:
      isClientUser && selectedStudioId
        ? { studioId: selectedStudioId }
        : undefined,
    skip: isClientUser && !selectedStudioId,
    fetchPolicy: "cache-and-network",
  });

  const { data: favoritesData, refetch: refetchFavorites } = useQuery(
    MY_FAVORITE_CLASS_SESSIONS,
    {
      variables: selectedStudioId ? { studioId: selectedStudioId } : undefined,
      skip: !canFavorite,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    },
  );

  const [updateSession] = useMutation(UPDATE_CLASS_SESSION);
  const [deleteSession] = useMutation(DELETE_CLASS_SESSION);
  const [toggleFavoriteSession, { loading: togglingFavorite }] = useMutation(
    TOGGLE_FAVORITE_CLASS_SESSION,
  );
  const { addToast } = useToast();
  const canDelete = canDeleteSessions(user);

  if (loading)
    return <p className="text-sm text-slate-400">Loading sessions…</p>;
  if (error)
    return <p className="text-sm text-rose-400">Error loading sessions</p>;

  const sessions = (data?.classSessions || []).filter(
    (s) => s.classTemplate?.id === id,
  );
  const myBookings = (myBookingsData?.myBookings || []).filter(
    (b) => b?.status !== "cancelled",
  );
  const bookingBySessionId = new Map(
    myBookings.map((b) => [b?.classSession?.id, b]).filter(([sid]) => !!sid),
  );

  const template =
    (templatesData?.classTemplates || []).find((t) => t.id === id) ||
    sessions[0]?.classTemplate ||
    null;
  const favoriteIds = new Set(
    (favoritesData?.myFavoriteClassSessions || []).map((s) => s.id),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-50 truncate">
              {template?.title || "Class"}
            </h1>
            {template?.description ? (
              <p className="mt-2 text-sm text-slate-300">
                {template.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Upcoming scheduled classes for this program.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
              {template?.durationMinutes ? (
                <span>{template.durationMinutes} min</span>
              ) : null}
              {template?.studioLocation?.name ? (
                <span>• {template.studioLocation.name}</span>
              ) : null}
              {template?.instructor?.name ? (
                <span>• {template.instructor.name}</span>
              ) : null}
              {typeof template?.priceCents === "number" ? (
                <span>
                  • {formatPrice(template.priceCents, template.currency)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/schedule"
              className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
            >
              Back to calendar
            </Link>
          </div>
        </div>
      </header>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No sessions have been scheduled yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 shadow-sm shadow-black/20 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-sm font-medium text-slate-50">
                  {new Date(s.startTime).toLocaleString()}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span>Room: {s.room || "TBD"}</span>
                  <span>Seats available: {s.seatsAvailable}</span>
                  {s.instructor && <span>Instructor: {s.instructor.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {canManageSession && (
                  <Link
                    to={`/sessions/${s.id}/manage`}
                    className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                  >
                    Manage
                  </Link>
                )}
                {canFavorite && (
                  <button
                    type="button"
                    disabled={togglingFavorite}
                    onClick={async () => {
                      try {
                        const res = await toggleFavoriteSession({
                          variables: { classSessionId: s.id },
                        });
                        const payload = res.data?.toggleFavoriteClassSession;
                        const errors = payload?.errors || [];
                        if (errors.length) throw new Error(errors.join(", "));
                        await refetchFavorites();
                        addToast({
                          message: payload?.favorited
                            ? "Saved to favorites"
                            : "Removed from favorites",
                          type: "success",
                        });
                      } catch (e) {
                        addToast({
                          message: e.message || "Could not update favorite",
                          type: "error",
                        });
                      }
                    }}
                    className={
                      favoriteIds.has(s.id)
                        ? "inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        : "inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    }
                    aria-label={
                      favoriteIds.has(s.id)
                        ? "Unfavorite session"
                        : "Favorite session"
                    }
                    title={favoriteIds.has(s.id) ? "Saved" : "Save"}
                  >
                    {favoriteIds.has(s.id) ? "♥ Saved" : "♡ Save"}
                  </button>
                )}
                {isClientUser && bookingBySessionId.has(s.id) ? (
                  <Link
                    to={`/bookings/${bookingBySessionId.get(s.id).id}`}
                    className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                  >
                    Booked
                  </Link>
                ) : (
                  (() => {
                    const _duration = s.classTemplate?.durationMinutes || 50;
                    const _cutoffMs = 2 * _duration * 60 * 1000;
                    const _bookingClosed =
                      isClientUser &&
                      new Date(s.startTime) - Date.now() < _cutoffMs;
                    return _bookingClosed ? (
                      <span
                        title={`Booking closed — class starts in less than ${2 * _duration} min`}
                        className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-500"
                      >
                        Closed
                      </span>
                    ) : (
                      <Link
                        to={`/booking/${s.id}`}
                        className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 font-semibold text-on-accent hover:bg-sky-400"
                      >
                        Book
                      </Link>
                    );
                  })()
                )}
                {(canEditSession(user, s) || canDelete) && (
                  <>
                    {canEditSession(user, s) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const newRoom = window.prompt("Room", s.room || "");
                          if (newRoom === null) return;
                          try {
                            const res = await updateSession({
                              variables: { id: s.id, room: newRoom || null },
                            });
                            const errors =
                              res.data?.updateClassSession?.errors || [];
                            if (errors.length)
                              throw new Error(errors.join(", "));
                            addToast({
                              message: "Session updated",
                              type: "success",
                            });
                          } catch (e) {
                            addToast({
                              message: e.message || "Update failed",
                              type: "error",
                            });
                          }
                        }}
                        className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Cancel this session?")) return;
                          try {
                            const res = await deleteSession({
                              variables: { id: s.id },
                            });
                            const payload = res.data?.deleteClassSession;
                            if (!payload?.success)
                              throw new Error(
                                (payload?.errors || ["Cancel failed"]).join(
                                  ", ",
                                ),
                              );
                            addToast({
                              message: "Session cancelled",
                              type: "success",
                            });
                          } catch (e) {
                            addToast({
                              message: e.message || "Cancel failed",
                              type: "error",
                            });
                          }
                        }}
                        className="rounded-full border border-rose-600/60 px-3 py-1 text-rose-200 hover:bg-rose-600/10"
                      >
                        Cancel
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
