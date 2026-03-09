import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link } from "react-router-dom";

import {
  MY_BOOKINGS,
  MY_FAVORITE_CLASS_SESSIONS,
  STUDIO_LOCATIONS,
} from "../../apollo/queries";
import { TOGGLE_FAVORITE_CLASS_SESSION } from "../../apollo/mutations";
import { useStudio } from "../../studio/StudioProvider";
import { useToast } from "../../components/shared/ToastProvider";

function formatDateTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Favorites() {
  const { studios, selectedStudioId, setSelectedStudioId } = useStudio();
  const { addToast } = useToast();

  const [studioIdFilter, setStudioIdFilter] = useState(selectedStudioId || "");
  const [studioLocationIdFilter, setStudioLocationIdFilter] = useState("");

  const didInitStudioFilter = useRef(false);
  useEffect(() => {
    if (didInitStudioFilter.current) return;

    // If the client hasn't selected a studio yet, default to the first studio so
    // "Saved" shows results immediately. User can still switch back to "All studios".
    if (!studioIdFilter && !selectedStudioId && (studios || []).length > 0) {
      setStudioIdFilter(studios[0].id);
    }

    didInitStudioFilter.current = true;
  }, [selectedStudioId, studioIdFilter, studios]);

  const { data: locationsData } = useQuery(STUDIO_LOCATIONS, {
    variables: studioIdFilter ? { studioId: studioIdFilter } : undefined,
    skip: !studioIdFilter,
  });

  const locations = locationsData?.studioLocations || [];

  const favoritesVars = useMemo(() => {
    const v = {};
    if (studioIdFilter) v.studioId = studioIdFilter;
    if (studioLocationIdFilter) v.studioLocationId = studioLocationIdFilter;
    return v;
  }, [studioIdFilter, studioLocationIdFilter]);

  const { data, loading, error, refetch } = useQuery(
    MY_FAVORITE_CLASS_SESSIONS,
    {
      variables: favoritesVars,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    },
  );

  const { data: myBookingsData } = useQuery(MY_BOOKINGS, {
    variables: favoritesVars,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const didWarmRefetch = useRef(false);
  useEffect(() => {
    if (didWarmRefetch.current) return;
    if (!studioIdFilter) return;
    if (loading) return;

    didWarmRefetch.current = true;
    refetch();
  }, [studioIdFilter, loading, refetch]);

  const [toggleFavorite, { loading: toggling }] = useMutation(
    TOGGLE_FAVORITE_CLASS_SESSION,
  );

  const favoriteSessions = data?.myFavoriteClassSessions || [];

  const bookingBySessionId = useMemo(() => {
    const map = new Map();
    for (const b of myBookingsData?.myBookings || []) {
      if (!b?.id) continue;
      if (b?.status === "cancelled") continue;
      const sessionId = b?.classSession?.id;
      if (!sessionId) continue;
      map.set(sessionId, b);
    }
    return map;
  }, [myBookingsData?.myBookings]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-50">Saved</h1>
        <p className="text-sm text-slate-400">
          Save sessions for later, then come back to book and pay.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Studio
          </label>
          <select
            value={studioIdFilter}
            onChange={(e) => {
              setStudioIdFilter(e.target.value);
              setStudioLocationIdFilter("");
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All studios</option>
            {(studios || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Location
          </label>
          <select
            value={studioLocationIdFilter}
            onChange={(e) => setStudioLocationIdFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            disabled={!studioIdFilter}
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {!studioIdFilter && (
            <div className="text-[11px] text-slate-500">
              Choose a studio to filter by location.
            </div>
          )}
        </div>
      </section>

      {loading && <p className="text-sm text-slate-400">Loading favorites…</p>}
      {error && (
        <p className="text-sm text-rose-400">Error loading favorites</p>
      )}

      {!loading && favoriteSessions.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
          <div className="font-semibold text-slate-50">
            No saved sessions yet
          </div>
          <div className="mt-1 text-slate-400">
            Tap the heart on any session to save it here.
          </div>
        </div>
      )}

      {favoriteSessions.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {favoriteSessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3 shadow-sm shadow-black/20 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-50 truncate">
                  {s.classTemplate?.title || "Session"}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span>{formatDateTime(s.startTime)}</span>
                  {s.classTemplate?.studioLocation?.name && (
                    <span>• {s.classTemplate.studioLocation.name}</span>
                  )}
                  {s.instructor?.name && <span>• {s.instructor.name}</span>}
                  {s.room && <span>• Room {s.room}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {bookingBySessionId.has(s.id) ? (
                  <Link
                    to={`/bookings/${bookingBySessionId.get(s.id).id}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                    aria-label="View booking"
                  >
                    View booking
                  </Link>
                ) : (
                  <Link
                    to={`/booking/${s.id}`}
                    state={{ studioId: s?.studioId || null }}
                    onClick={() => {
                      if (s?.studioId) setSelectedStudioId(s.studioId);
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                    aria-label="Book saved session"
                  >
                    Book
                  </Link>
                )}
                <button
                  type="button"
                  disabled={toggling}
                  onClick={async () => {
                    try {
                      const res = await toggleFavorite({
                        variables: { classSessionId: s.id },
                      });
                      const payload = res.data?.toggleFavoriteClassSession;
                      const errors = payload?.errors || [];
                      if (errors.length) throw new Error(errors.join(", "));
                      await refetch();
                      addToast({
                        message: "Removed from favorites",
                        type: "success",
                      });
                    } catch (e) {
                      addToast({
                        message: e.message || "Failed to update favorite",
                        type: "error",
                      });
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Remove from favorites"
                >
                  ♥ Saved
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
