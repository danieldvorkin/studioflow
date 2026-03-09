import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import {
  CLASS_SESSIONS,
  BOOKINGS,
  CURRENT_USER,
  CLASS_TEMPLATES,
  INSTRUCTORS,
  MY_BOOKINGS,
  MY_FAVORITE_CLASS_SESSIONS,
  UPCOMING_BOOKABLE_CLASS_SESSIONS_COUNT,
} from "../../apollo/queries";
import { useLocationContext } from "../../location/LocationProvider";
import {
  CREATE_CLASS_SESSION,
  UPDATE_CLASS_SESSION,
  DELETE_CLASS_SESSION,
  TOGGLE_FAVORITE_CLASS_SESSION,
} from "../../apollo/mutations";
import { useToast } from "../../components/shared/ToastProvider";
import {
  canDeleteSessions,
  canEditSession,
  canScheduleSessions,
  isInstructor as isInstructorUser,
  isOwner,
  isStaff,
} from "../../auth/permissions";
import { useStudio } from "../../studio/StudioProvider";

const TEMPLATE_COLOR_CLASSES = [
  "border-l-sky-400",
  "border-l-fuchsia-400",
  "border-l-emerald-400",
  "border-l-amber-400",
  "border-l-violet-400",
  "border-l-cyan-400",
  "border-l-rose-400",
  "border-l-lime-400",
];

const EMPTY_SESSIONS = [];

function stableColorClassForTemplateId(templateId) {
  const str = templateId?.toString() || "";
  if (!str) return "border-l-slate-700";

  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const idx = Math.abs(hash) % TEMPLATE_COLOR_CLASSES.length;
  return TEMPLATE_COLOR_CLASSES[idx];
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // make Sunday 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function localDayKey(date) {
  const d = new Date(date);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateFromLocalDayKey(key) {
  if (!key) return null;
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDay(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(start, end) {
  return `${formatTime(start)}–${formatTime(end)}`;
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function durationMinutesForSession(session) {
  const start = session?.startTime ? new Date(session.startTime) : null;
  const end = session?.endTime ? new Date(session.endTime) : null;
  if (start && end && end > start) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
  const fallback = session?.classTemplate?.durationMinutes;
  if (typeof fallback === "number" && fallback > 0) return fallback;
  return 50;
}

export default function Schedule() {
  useDocumentTitle("Schedule");
  const { data: userData } = useQuery(CURRENT_USER);
  const currentUser = userData?.currentUser;
  const canCreateSessions = canScheduleSessions(currentUser);
  const userIsOwner = isOwner(currentUser);
  const userIsStaff = isStaff(currentUser);
  const userIsInstructor = isInstructorUser(currentUser);
  const roleName = (currentUser?.roleName || "").toString().toLowerCase();
  const userIsClient = roleName === "client";
  const [viewMode, setViewMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedMonthDayKey, setSelectedMonthDayKey] = useState(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventDayKey, setNewEventDayKey] = useState(null);
  const [newEventForm, setNewEventForm] = useState({
    classTemplateId: "",
    time: "09:00",
    capacity: "",
    room: "",
    bundleEnabled: false,
    bundleSpots: "",
  });
  const [monthExpandedSessionId, setMonthExpandedSessionId] = useState(null);
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const monthStart = useMemo(() => startOfMonth(anchorDate), [anchorDate]);
  const monthEnd = useMemo(() => endOfMonth(anchorDate), [anchorDate]);
  const monthGridStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const monthGridEnd = useMemo(
    () => startOfWeek(addDays(monthEnd, -1)),
    [monthEnd],
  );

  const monthRangeTo = useMemo(() => addDays(monthGridEnd, 7), [monthGridEnd]);

  const todayWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const todayWeekEnd = useMemo(
    () => addDays(todayWeekStart, 7),
    [todayWeekStart],
  );

  const rangeFrom = useMemo(
    () => (viewMode === "month" ? monthGridStart : weekStart),
    [monthGridStart, viewMode, weekStart],
  );
  const rangeTo = useMemo(
    () => (viewMode === "month" ? monthRangeTo : weekEnd),
    [monthRangeTo, viewMode, weekEnd],
  );

  const rangeFromIso = useMemo(() => rangeFrom.toISOString(), [rangeFrom]);
  const rangeToIso = useMemo(() => rangeTo.toISOString(), [rangeTo]);

  const { locationId } = useLocationContext();
  const { selectedStudioId } = useStudio();

  const { data: upcomingAllStudiosData, loading: upcomingAllStudiosLoading } =
    useQuery(UPCOMING_BOOKABLE_CLASS_SESSIONS_COUNT, {
      skip: !userIsClient,
      variables: { studioId: null, studioLocationId: null },
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    });

  const { data, loading, previousData, refetch } = useQuery(CLASS_SESSIONS, {
    variables: {
      from: rangeFromIso,
      to: rangeToIso,
      studioLocationId: locationId || null,
      studioId: userIsClient ? selectedStudioId : null,
    },
    skip: userIsClient && !selectedStudioId,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data: bookingsData } = useQuery(BOOKINGS, {
    skip: !(viewMode === "month" && canCreateSessions),
    variables:
      userIsClient && selectedStudioId
        ? { studioLocationId: locationId || null, studioId: selectedStudioId }
        : { studioLocationId: locationId || null },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data: myBookingsData } = useQuery(MY_BOOKINGS, {
    skip: !userIsClient,
    variables: selectedStudioId
      ? { studioLocationId: locationId || null, studioId: selectedStudioId }
      : { studioLocationId: locationId || null },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data: favoritesData, refetch: refetchFavorites } = useQuery(
    MY_FAVORITE_CLASS_SESSIONS,
    {
      skip: !userIsClient,
      variables: selectedStudioId ? { studioId: selectedStudioId } : {},
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    },
  );

  const { data: templatesData } = useQuery(CLASS_TEMPLATES, {
    skip: !canCreateSessions,
    variables: {
      studioLocationId: locationId || null,
      instructorId: userIsInstructor ? currentUser?.id : undefined,
    },
  });
  const [createClassSession] = useMutation(CREATE_CLASS_SESSION);
  const [updateClassSession] = useMutation(UPDATE_CLASS_SESSION);
  const [deleteClassSession] = useMutation(DELETE_CLASS_SESSION);
  const [toggleFavoriteSession, { loading: togglingFavorite }] = useMutation(
    TOGGLE_FAVORITE_CLASS_SESSION,
  );

  const { data: instructorsData } = useQuery(INSTRUCTORS, {
    skip: !(userIsOwner || userIsStaff),
  });
  const { addToast } = useToast();

  const sessions =
    data?.classSessions || previousData?.classSessions || EMPTY_SESSIONS;

  const myActiveBookings = useMemo(() => {
    const raw = myBookingsData?.myBookings || [];
    return raw.filter((b) => b && b.status !== "cancelled" && !b.archived);
  }, [myBookingsData]);

  const myBookingBySessionId = useMemo(() => {
    if (!userIsClient) return new Map();
    return new Map(
      myActiveBookings
        .map((b) => [b?.classSession?.id, b])
        .filter(([sid]) => !!sid),
    );
  }, [myActiveBookings, userIsClient]);

  const favoriteIds = useMemo(() => {
    if (!userIsClient) return new Set();
    return new Set(
      (favoritesData?.myFavoriteClassSessions || []).map((s) => s.id),
    );
  }, [favoritesData, userIsClient]);

  const instructors = useMemo(() => {
    const fromApi = instructorsData?.instructors || [];
    if (fromApi.length > 0) return fromApi;

    const map = new Map();
    sessions.forEach((s) => {
      if (s.instructor) map.set(s.instructor.id, s.instructor);
    });
    return Array.from(map.values());
  }, [instructorsData, sessions]);

  const [instructorId, setInstructorId] = useState("");

  useEffect(() => {
    if (userIsInstructor) {
      setInstructorId(currentUser.id);
    }
  }, [currentUser, userIsInstructor]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDays(weekStart, idx));
  }, [weekStart]);

  const monthDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const daysAcc = [];
    let cursor = new Date(rangeFrom);
    while (cursor < rangeTo) {
      daysAcc.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return daysAcc;
  }, [rangeFrom, rangeTo, viewMode]);

  const monthWeeks = useMemo(() => {
    if (viewMode !== "month") return [];
    const weeks = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }
    return weeks;
  }, [monthDays, viewMode]);

  useEffect(() => {
    if (viewMode !== "month") {
      setSelectedMonthDayKey(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inRange = today >= rangeFrom && today < rangeTo;
    const nextSelected = inRange ? today : new Date(monthStart);
    nextSelected.setHours(0, 0, 0, 0);

    const nextKey = localDayKey(nextSelected);
    setSelectedMonthDayKey((prev) => (prev === nextKey ? prev : nextKey));
  }, [monthStart, rangeFrom, rangeTo, viewMode]);

  const sessionsByDay = useMemo(() => {
    return days.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = addDays(dayStart, 1);

      const filtered = sessions.filter((s) => {
        const start = new Date(s.startTime);
        if (start < dayStart || start >= dayEnd) return false;
        if (instructorId && (!s.instructor || s.instructor.id !== instructorId))
          return false;
        return true;
      });

      filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      return { date: day, sessions: filtered };
    });
  }, [days, sessions, instructorId]);

  const sessionsByDayKey = useMemo(() => {
    const map = new Map();
    const allDays = viewMode === "month" ? monthDays : days;

    allDays.forEach((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = addDays(dayStart, 1);

      const filtered = sessions.filter((s) => {
        const start = new Date(s.startTime);
        if (start < dayStart || start >= dayEnd) return false;
        if (instructorId && (!s.instructor || s.instructor.id !== instructorId))
          return false;
        return true;
      });

      filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      map.set(localDayKey(dayStart), filtered);
    });

    return map;
  }, [days, instructorId, monthDays, sessions, viewMode]);

  const selectedMonthDate = useMemo(() => {
    if (viewMode !== "month" || !selectedMonthDayKey) return null;
    return dateFromLocalDayKey(selectedMonthDayKey);
  }, [selectedMonthDayKey, viewMode]);

  const selectedMonthSessions = useMemo(() => {
    if (viewMode !== "month" || !selectedMonthDayKey) return [];
    return sessionsByDayKey.get(selectedMonthDayKey) || [];
  }, [selectedMonthDayKey, sessionsByDayKey, viewMode]);

  const rangeLabel =
    viewMode === "month"
      ? anchorDate.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })
      : `${weekStart.toLocaleDateString()} – ${addDays(weekStart, 6).toLocaleDateString()}`;

  const templates = templatesData?.classTemplates || [];

  const defaultNewEventDayKey = useMemo(() => {
    if (viewMode === "month") return selectedMonthDayKey;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = addDays(weekStart, 7);
    const inRange = today >= weekStart && today < weekEnd;
    const chosen = inRange ? today : new Date(weekStart);
    return localDayKey(chosen);
  }, [selectedMonthDayKey, viewMode, weekStart]);

  const defaultTimeHHMM = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    const rounded = Math.ceil(m / 30) * 30;
    const nextH = rounded === 60 ? (h + 1) % 24 : h;
    const nextM = rounded === 60 ? 0 : rounded;

    const pad2 = (n) => String(n).padStart(2, "0");
    return `${pad2(nextH)}:${pad2(nextM)}`;
  };

  const [editingSessionId, setEditingSessionId] = useState(null);
  const [timeForm, setTimeForm] = useState({
    startTime: "",
    durationMinutes: "",
  });
  const [dragOverDayKey, setDragOverDayKey] = useState(null);

  const [hoveredSession, setHoveredSession] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const closeNewEventModal = () => {
    setShowNewEventModal(false);
    setNewEventDayKey(null);
  };

  const openNewEventModal = (dayKey) => {
    const effectiveDayKey =
      dayKey || defaultNewEventDayKey || localDayKey(new Date());
    setSelectedMonthDayKey(effectiveDayKey);
    setMonthExpandedSessionId(null);
    setNewEventDayKey(effectiveDayKey);
    setNewEventForm((prev) => ({
      ...prev,
      classTemplateId: prev.classTemplateId || templates[0]?.id || "",
      time: prev.time || defaultTimeHHMM(),
    }));
    setShowNewEventModal(true);
  };

  const createSessionForDayAndTime = async ({
    dayKey,
    classTemplateId,
    time,
    capacity,
    room,
    bundleEnabled,
    bundleSpots,
  }) => {
    if (!dayKey || !classTemplateId || !time) return;

    const base = dateFromLocalDayKey(dayKey);
    if (!base) return;
    const [hh, mm] = time.split(":").map((v) => Number(v));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
    base.setHours(hh, mm, 0, 0);

    const startIso = base.toISOString();

    const variables = {
      classTemplateId,
      startTime: startIso,
      endTime: null,
      capacity: capacity ? Number(capacity) : null,
      room: room || null,
    };

    if (userIsOwner || userIsStaff || userIsInstructor) {
      variables.bundleEnabled = bundleEnabled === true;
      variables.bundleSpots = bundleEnabled
        ? bundleSpots
          ? Number(bundleSpots)
          : null
        : null;
    }

    const res = await createClassSession({ variables });

    const payload = res.data?.createClassSession;
    const errors = payload?.errors || [];
    if (errors.length || !payload?.classSession) {
      throw new Error(errors.join(", ") || "Could not create session");
    }
  };

  const hideTooltip = () => {
    setHoveredSession(null);
  };

  const showTooltip = (session, e) => {
    setHoveredSession(session);
    if (e?.clientX != null && e?.clientY != null) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const openTimeEditor = (session) => {
    setEditingSessionId(session.id);
    setTimeForm({
      startTime: toDatetimeLocalValue(session.startTime),
      durationMinutes: String(durationMinutesForSession(session)),
    });
  };

  const saveTimeEditor = async (session) => {
    const startLocal = timeForm.startTime;
    if (!startLocal) return;
    const nextStart = new Date(startLocal);
    if (Number.isNaN(nextStart.getTime())) return;

    const mins = Number(timeForm.durationMinutes);
    const durationMins =
      Number.isFinite(mins) && mins > 0
        ? mins
        : durationMinutesForSession(session);
    const nextEnd = new Date(nextStart.getTime() + durationMins * 60000);

    try {
      const res = await updateClassSession({
        variables: {
          id: session.id,
          startTime: nextStart.toISOString(),
          endTime: nextEnd.toISOString(),
        },
      });
      const errors = res.data?.updateClassSession?.errors || [];
      if (errors.length) throw new Error(errors.join(", "));
      addToast({ message: "Session time updated", type: "success" });
      setEditingSessionId(null);
      await refetch();
    } catch (e) {
      addToast({ message: e.message || "Update failed", type: "error" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            {viewMode === "month" ? "Monthly calendar" : "Weekly calendar"}
          </h1>
          <p className="text-sm text-slate-400">
            {viewMode === "month"
              ? "Browse classes by month."
              : "View and schedule classes by week."}
          </p>
          {userIsClient && (
            <div className="mt-2 text-xs text-slate-400">
              {upcomingAllStudiosLoading
                ? "Loading upcoming sessions…"
                : `Upcoming bookable sessions (all studios): ${upcomingAllStudiosData?.upcomingBookableClassSessionsCount ?? 0}`}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="mr-2 inline-flex items-center rounded-full border border-slate-700 bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`rounded-full px-3 py-1 font-medium ${viewMode === "week" ? "bg-slate-800 text-slate-50" : "text-slate-200 hover:bg-slate-800/60"}`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`rounded-full px-3 py-1 font-medium ${viewMode === "month" ? "bg-slate-800 text-slate-50" : "text-slate-200 hover:bg-slate-800/60"}`}
            >
              Month
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (viewMode === "month") {
                const d = new Date(anchorDate);
                d.setMonth(d.getMonth() - 1);
                setAnchorDate(d);
              } else {
                setAnchorDate(addDays(weekStart, -7));
              }
            }}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
          >
            {viewMode === "month" ? "Previous month" : "Previous week"}
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
          >
            {viewMode === "month" ? "This month" : "This week"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (viewMode === "month") {
                const d = new Date(anchorDate);
                d.setMonth(d.getMonth() + 1);
                setAnchorDate(d);
              } else {
                setAnchorDate(addDays(weekStart, 7));
              }
            }}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
          >
            {viewMode === "month" ? "Next month" : "Next week"}
          </button>
          {canCreateSessions && templates.length > 0 && (
            <button
              type="button"
              onClick={() => openNewEventModal(defaultNewEventDayKey)}
              className="ml-2 rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400"
            >
              Add session
            </button>
          )}
          <span className="ml-2 text-xs text-slate-400">{rangeLabel}</span>
        </div>
      </header>

      {instructors.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="text-xs text-slate-300">Instructor</label>
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            disabled={userIsInstructor}
          >
            {!userIsInstructor && <option value="">All instructors</option>}
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name || inst.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
          Loading schedule…
        </div>
      )}

      {viewMode === "month" ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-7 gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthWeeks.flat().map((date) => {
              const dayStart = new Date(date);
              dayStart.setHours(0, 0, 0, 0);
              const key = localDayKey(dayStart);
              const daySessions = sessionsByDayKey.get(key) || [];
              const isInMonth = date.getMonth() === anchorDate.getMonth();
              const isInCurrentWeek =
                dayStart >= todayWeekStart && dayStart < todayWeekEnd;
              const isSelected = selectedMonthDayKey === key;
              // new-event modal replaces inline add form

              return (
                <div
                  key={key}
                  onClick={() => {
                    setSelectedMonthDayKey(key);
                    closeNewEventModal();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDayKey(key);
                  }}
                  onDragLeave={() => {
                    setDragOverDayKey((k) => (k === key ? null : k));
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverDayKey(null);
                    const sessionId =
                      e.dataTransfer.getData("text/session-id") ||
                      e.dataTransfer.getData("text/plain");
                    if (!sessionId) return;

                    const session = sessions.find(
                      (s) => s.id?.toString() === sessionId.toString(),
                    );
                    if (!session) return;
                    if (!canEditSession(currentUser, session)) return;

                    const start = new Date(session.startTime);
                    if (Number.isNaN(start.getTime())) return;

                    const targetDayStart = new Date(date);
                    targetDayStart.setHours(
                      start.getHours(),
                      start.getMinutes(),
                      0,
                      0,
                    );

                    const durationMins = durationMinutesForSession(session);
                    const targetEnd = new Date(
                      targetDayStart.getTime() + durationMins * 60000,
                    );

                    const sameDay =
                      new Date(session.startTime).toDateString() ===
                      targetDayStart.toDateString();
                    if (sameDay) return;

                    try {
                      const res = await updateClassSession({
                        variables: {
                          id: session.id,
                          startTime: targetDayStart.toISOString(),
                          endTime: targetEnd.toISOString(),
                        },
                      });
                      const errors = res.data?.updateClassSession?.errors || [];
                      if (errors.length) throw new Error(errors.join(", "));
                      addToast({ message: "Session moved", type: "success" });
                      await refetch();
                    } catch (err) {
                      addToast({
                        message: err.message || "Move failed",
                        type: "error",
                      });
                    }
                  }}
                  className={`relative flex min-h-[130px] flex-col gap-1 rounded-2xl border p-2 text-left text-xs shadow-sm shadow-black/20 hover:border-slate-600 ${
                    dragOverDayKey === key
                      ? "border-sky-500/70"
                      : isInCurrentWeek
                        ? "border-sky-500/50 bg-sky-500/10 ring-2 ring-sky-500/20"
                        : isInMonth
                          ? "border-slate-800 bg-slate-900/80"
                          : "border-slate-900 bg-slate-950/40 text-slate-500"
                  } ${isSelected ? "ring-2 ring-emerald-500/30 border-emerald-500/50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold ${
                        isInCurrentWeek ? "text-sky-100" : "text-slate-200"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-[11px] text-slate-400">
                        {daySessions.length}
                      </span>
                    )}
                  </div>

                  <div
                    className="mt-1 flex flex-col gap-1 overflow-auto pr-1"
                    style={{ maxHeight: 104 }}
                  >
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        draggable={canEditSession(currentUser, s)}
                        onDragStart={(e) => {
                          if (!canEditSession(currentUser, s)) return;
                          try {
                            e.dataTransfer.setData("text/session-id", s.id);
                          } catch {
                            e.dataTransfer.setData("text/plain", s.id);
                          }
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onMouseEnter={(e) => showTooltip(s, e)}
                        onMouseMove={(e) =>
                          hoveredSession?.id === s.id && showTooltip(s, e)
                        }
                        onMouseLeave={hideTooltip}
                        onFocus={(e) => showTooltip(s, e)}
                        onBlur={hideTooltip}
                        className={`flex items-center justify-between gap-2 rounded-lg border border-slate-800 border-l-4 px-2 py-1 text-[11px] ${stableColorClassForTemplateId(s.classTemplate?.id)} ${
                          canEditSession(currentUser, s)
                            ? "cursor-grab bg-slate-900/90 text-slate-200 active:cursor-grabbing"
                            : "bg-slate-900/60 text-slate-400"
                        }`}
                        title={`${formatTime(s.startTime)} ${s.classTemplate?.title || "Class"}`}
                        tabIndex={0}
                      >
                        <div className="min-w-0 flex-1 truncate">
                          {formatTime(s.startTime)}{" "}
                          {s.classTemplate?.title || "Class"}
                        </div>

                        <div className="flex items-center gap-1">
                          {canCreateSessions && (
                            <button
                              type="button"
                              title="Duplicate"
                              aria-label="Duplicate session"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  const start = new Date(s.startTime);
                                  if (Number.isNaN(start.getTime()))
                                    throw new Error(
                                      "Invalid session start time",
                                    );

                                  const end = s.endTime
                                    ? new Date(s.endTime)
                                    : null;
                                  if (end && Number.isNaN(end.getTime()))
                                    throw new Error("Invalid session end time");

                                  let createdSession = null;
                                  let usedWeeks = null;
                                  let lastError = null;

                                  for (
                                    let weeksAhead = 1;
                                    weeksAhead <= 8;
                                    weeksAhead += 1
                                  ) {
                                    const candidateStart = new Date(start);
                                    candidateStart.setDate(
                                      candidateStart.getDate() + 7 * weeksAhead,
                                    );

                                    const candidateEnd = end
                                      ? new Date(
                                          end.getTime() +
                                            7 *
                                              weeksAhead *
                                              24 *
                                              60 *
                                              60 *
                                              1000,
                                        )
                                      : null;

                                    const res = await createClassSession({
                                      variables: {
                                        classTemplateId: s.classTemplate?.id,
                                        startTime: candidateStart.toISOString(),
                                        endTime: candidateEnd
                                          ? candidateEnd.toISOString()
                                          : null,
                                        capacity:
                                          typeof s.capacity === "number"
                                            ? s.capacity
                                            : null,
                                        room: s.room || null,
                                        bundleEnabled:
                                          userIsOwner ||
                                          userIsStaff ||
                                          userIsInstructor
                                            ? s.bundleEnabled === true
                                            : undefined,
                                        bundleSpots:
                                          (userIsOwner ||
                                            userIsStaff ||
                                            userIsInstructor) &&
                                          s.bundleEnabled === true
                                            ? typeof s.bundleSpots === "number"
                                              ? s.bundleSpots
                                              : null
                                            : undefined,
                                      },
                                    });

                                    const payload =
                                      res.data?.createClassSession;
                                    const errors = payload?.errors || [];
                                    if (
                                      !errors.length &&
                                      payload?.classSession
                                    ) {
                                      createdSession = payload.classSession;
                                      usedWeeks = weeksAhead;
                                      break;
                                    }

                                    lastError =
                                      errors.join(", ") ||
                                      "Could not duplicate session";
                                    const canRetry = errors.some((msg) =>
                                      /start time|overlap|taken/i.test(msg),
                                    );
                                    if (!canRetry) break;
                                  }

                                  if (!createdSession)
                                    throw new Error(
                                      lastError ||
                                        "Could not duplicate session",
                                    );

                                  addToast({
                                    message:
                                      usedWeeks === 1
                                        ? "Session duplicated (next week)"
                                        : `Session duplicated (+${usedWeeks} weeks)`,
                                    type: "success",
                                  });
                                  await refetch();
                                } catch (err) {
                                  addToast({
                                    message: err.message || "Duplicate failed",
                                    type: "error",
                                  });
                                }
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-950/30 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              ⧉
                            </button>
                          )}

                          {canDeleteSessions(currentUser) && (
                            <button
                              type="button"
                              title="Cancel"
                              aria-label="Cancel session"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!window.confirm("Cancel this session?"))
                                  return;
                                try {
                                  const res = await deleteClassSession({
                                    variables: { id: s.id },
                                  });
                                  const payload = res.data?.deleteClassSession;
                                  if (!payload?.success) {
                                    throw new Error(
                                      (
                                        payload?.errors || ["Cancel failed"]
                                      ).join(", "),
                                    );
                                  }
                                  addToast({
                                    message: "Session cancelled",
                                    type: "success",
                                  });
                                  await refetch();
                                } catch (err) {
                                  addToast({
                                    message: err.message || "Cancel failed",
                                    type: "error",
                                  });
                                }
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-rose-600/60 bg-slate-950/30 text-[11px] text-rose-200 hover:bg-rose-600/10"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {canCreateSessions && isInMonth && templates.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openNewEventModal(key);
                        }}
                        className="mt-1 inline-flex w-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/30 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-900"
                      >
                        + Add event
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Events
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-50">
                  {selectedMonthDate
                    ? formatDay(selectedMonthDate)
                    : "Select a day"}
                </div>
              </div>
              {selectedMonthDate && (
                <div className="text-xs text-slate-500">
                  {selectedMonthSessions.length} sessions
                </div>
              )}
            </div>

            {!selectedMonthDate ? (
              <p className="mt-3 text-sm text-slate-400">
                Click a day above to see its schedule.
              </p>
            ) : selectedMonthSessions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                No classes scheduled for this day.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {selectedMonthSessions.map((s) => (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-1 rounded-xl border border-slate-800 border-l-4 bg-slate-900/90 px-3 py-2 text-sm ${stableColorClassForTemplateId(s.classTemplate?.id)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-50">
                          {s.classTemplate?.title || "Class"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {formatTimeRange(
                            s.startTime,
                            s.endTime ||
                              new Date(
                                new Date(s.startTime).getTime() +
                                  durationMinutesForSession(s) * 60000,
                              ).toISOString(),
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-500">
                        {formatTime(s.startTime)}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {s.instructor?.name && <span>{s.instructor.name}</span>}
                      {s.room && <span>· Room {s.room}</span>}
                      {typeof s.seatsAvailable === "number" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {s.seatsAvailable} spots left
                        </span>
                      )}
                    </div>

                    {(canCreateSessions || userIsClient) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {userIsClient && (
                          <button
                            type="button"
                            disabled={togglingFavorite}
                            onClick={async () => {
                              try {
                                const res = await toggleFavoriteSession({
                                  variables: { classSessionId: s.id },
                                });
                                const payload =
                                  res.data?.toggleFavoriteClassSession;
                                const errors = payload?.errors || [];
                                if (errors.length)
                                  throw new Error(errors.join(", "));
                                await refetchFavorites();
                                addToast({
                                  message: payload?.favorited
                                    ? "Saved to favorites"
                                    : "Removed from favorites",
                                  type: "success",
                                });
                              } catch (e) {
                                addToast({
                                  message:
                                    e.message || "Could not update favorite",
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
                        {userIsClient &&
                          (() => {
                            const existing = myBookingBySessionId.get(s.id);
                            if (existing?.id) {
                              return (
                                <Link
                                  to={`/bookings/${existing.id}`}
                                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                                >
                                  Booked
                                </Link>
                              );
                            }

                            const isFull =
                              typeof s.seatsAvailable === "number" &&
                              s.seatsAvailable <= 0;
                            if (isFull) {
                              return (
                                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-400">
                                  Full
                                </span>
                              );
                            }

                            return (
                              <Link
                                to={`/booking/${s.id}`}
                                className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400"
                              >
                                Book
                              </Link>
                            );
                          })()}

                        {canCreateSessions && (
                          <>
                            <Link
                              to={`/booking/${s.id}`}
                              className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400"
                            >
                              Book client
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setMonthExpandedSessionId((prev) =>
                                  prev === s.id ? null : s.id,
                                )
                              }
                              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                            >
                              View bookings
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {canCreateSessions && monthExpandedSessionId === s.id && (
                      <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                        {(() => {
                          const allBookings = bookingsData?.bookings || [];
                          const sessionBookings = allBookings
                            .filter((b) => b?.classSession?.id === s.id)
                            .filter((b) => b?.status !== "cancelled")
                            .filter((b) => !b?.archived);

                          if (sessionBookings.length === 0) {
                            return (
                              <div className="text-xs text-slate-400">
                                No active bookings for this session.
                              </div>
                            );
                          }

                          return (
                            <ul className="flex flex-col gap-1 text-xs">
                              {sessionBookings.map((b) => (
                                <li
                                  key={b.id}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <Link
                                    to={`/bookings/${b.id}`}
                                    className="min-w-0 flex-1 truncate text-slate-200 hover:text-sky-300"
                                  >
                                    {b.client?.name ||
                                      b.client?.email ||
                                      "Client"}
                                  </Link>
                                  <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                                    {b.status}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {sessionsByDay.map(({ date, sessions: daySessions }) => (
            <div
              key={date.toISOString()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDayKey(date.toISOString());
              }}
              onDragLeave={() => {
                setDragOverDayKey((k) => (k === date.toISOString() ? null : k));
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverDayKey(null);
                const sessionId =
                  e.dataTransfer.getData("text/session-id") ||
                  e.dataTransfer.getData("text/plain");
                if (!sessionId) return;

                const session = sessions.find(
                  (s) => s.id?.toString() === sessionId.toString(),
                );
                if (!session) return;
                if (!canEditSession(currentUser, session)) return;

                const start = new Date(session.startTime);
                if (Number.isNaN(start.getTime())) return;

                const targetDayStart = new Date(date);
                targetDayStart.setHours(
                  start.getHours(),
                  start.getMinutes(),
                  0,
                  0,
                );

                const durationMins = durationMinutesForSession(session);
                const targetEnd = new Date(
                  targetDayStart.getTime() + durationMins * 60000,
                );

                // no-op if same calendar day
                const sameDay =
                  new Date(session.startTime).toDateString() ===
                  targetDayStart.toDateString();
                if (sameDay) return;

                try {
                  const res = await updateClassSession({
                    variables: {
                      id: session.id,
                      startTime: targetDayStart.toISOString(),
                      endTime: targetEnd.toISOString(),
                    },
                  });
                  const errors = res.data?.updateClassSession?.errors || [];
                  if (errors.length) throw new Error(errors.join(", "));
                  addToast({ message: "Session moved", type: "success" });
                  await refetch();
                } catch (err) {
                  addToast({
                    message: err.message || "Move failed",
                    type: "error",
                  });
                }
              }}
              className={`flex flex-col gap-2 rounded-2xl border bg-slate-900/80 p-3 text-sm shadow-sm shadow-black/20 ${dragOverDayKey === date.toISOString() ? "border-sky-500/70" : "border-slate-800"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {formatDay(date)}
                </div>
                <span className="text-[11px] text-slate-500">
                  {daySessions.length} classes
                </span>
              </div>

              {daySessions.length === 0 ? (
                <p className="text-xs text-slate-500">No classes scheduled.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {daySessions.map((s) => (
                    <li
                      key={s.id}
                      draggable={canEditSession(currentUser, s)}
                      onDragStart={(e) => {
                        if (!canEditSession(currentUser, s)) return;
                        try {
                          e.dataTransfer.setData("text/session-id", s.id);
                        } catch {
                          e.dataTransfer.setData("text/plain", s.id);
                        }
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={`rounded-xl border border-slate-800 border-l-4 bg-slate-900/90 px-2.5 py-2 ${stableColorClassForTemplateId(s.classTemplate?.id)}`}
                    >
                      {editingSessionId === s.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-slate-50">
                              {s.classTemplate?.title || "Class"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatTimeRange(
                                s.startTime,
                                s.endTime ||
                                  new Date(
                                    new Date(s.startTime).getTime() +
                                      durationMinutesForSession(s) * 60000,
                                  ).toISOString(),
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-slate-300">
                                Start
                              </label>
                              <input
                                type="datetime-local"
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                value={timeForm.startTime}
                                onChange={(e) =>
                                  setTimeForm((f) => ({
                                    ...f,
                                    startTime: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-slate-300">
                                Duration (min)
                              </label>
                              <input
                                type="number"
                                min="1"
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                value={timeForm.durationMinutes}
                                onChange={(e) =>
                                  setTimeForm((f) => ({
                                    ...f,
                                    durationMinutes: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setEditingSessionId(null)}
                              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveTimeEditor(s)}
                              className="rounded-full bg-sky-500 px-3 py-1 font-semibold text-on-accent hover:bg-sky-400"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-slate-50">
                              {s.classTemplate?.title || "Class"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {s.endTime
                                ? formatTimeRange(s.startTime, s.endTime)
                                : formatTime(s.startTime)}
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            {s.instructor && <span>{s.instructor.name}</span>}
                            {s.room && <span>· Room {s.room}</span>}
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {s.seatsAvailable} spots left
                            </span>
                          </div>

                          {userIsClient && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <button
                                type="button"
                                disabled={togglingFavorite}
                                onClick={async () => {
                                  try {
                                    const res = await toggleFavoriteSession({
                                      variables: { classSessionId: s.id },
                                    });
                                    const payload =
                                      res.data?.toggleFavoriteClassSession;
                                    const errors = payload?.errors || [];
                                    if (errors.length)
                                      throw new Error(errors.join(", "));
                                    await refetchFavorites();
                                    addToast({
                                      message: payload?.favorited
                                        ? "Saved to favorites"
                                        : "Removed from favorites",
                                      type: "success",
                                    });
                                  } catch (e) {
                                    addToast({
                                      message:
                                        e.message ||
                                        "Could not update favorite",
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
                              {(() => {
                                const existing = myBookingBySessionId.get(s.id);
                                if (existing?.id) {
                                  return (
                                    <Link
                                      to={`/bookings/${existing.id}`}
                                      className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-100 hover:bg-slate-800"
                                    >
                                      Booked
                                    </Link>
                                  );
                                }

                                const isFull =
                                  typeof s.seatsAvailable === "number" &&
                                  s.seatsAvailable <= 0;
                                if (isFull) {
                                  return (
                                    <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 font-semibold text-slate-400">
                                      Full
                                    </span>
                                  );
                                }

                                return (
                                  <Link
                                    to={`/booking/${s.id}`}
                                    className="rounded-full bg-sky-500 px-3 py-1 font-semibold text-on-accent hover:bg-sky-400"
                                  >
                                    Book
                                  </Link>
                                );
                              })()}
                            </div>
                          )}

                          {(canEditSession(currentUser, s) ||
                            canDeleteSessions(currentUser)) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              {canEditSession(currentUser, s) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openTimeEditor(s)}
                                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                                  >
                                    Time
                                  </button>
                                  {(userIsOwner ||
                                    userIsStaff ||
                                    userIsInstructor) && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const currentEnabled =
                                          s.bundleEnabled === true;
                                        const currentSpots =
                                          typeof s.bundleSpots === "number"
                                            ? String(s.bundleSpots)
                                            : "";

                                        const next = window.prompt(
                                          currentEnabled
                                            ? "Bundle spots (leave blank to disable)"
                                            : "Bundle spots (required to enable)",
                                          currentSpots,
                                        );

                                        if (next === null) return;
                                        const trimmed = String(next).trim();

                                        const variables = { id: s.id };

                                        if (!trimmed) {
                                          variables.bundleEnabled = false;
                                          variables.bundleSpots = null;
                                        } else {
                                          const n = Number(trimmed);
                                          if (!Number.isFinite(n) || n <= 0) {
                                            addToast({
                                              message:
                                                "Bundle spots must be a positive number",
                                              type: "error",
                                            });
                                            return;
                                          }
                                          variables.bundleEnabled = true;
                                          variables.bundleSpots = Math.floor(n);
                                        }

                                        try {
                                          const res = await updateClassSession({
                                            variables,
                                          });
                                          const errors =
                                            res.data?.updateClassSession
                                              ?.errors || [];
                                          if (errors.length)
                                            throw new Error(errors.join(", "));
                                          addToast({
                                            message: "Bundle settings updated",
                                            type: "success",
                                          });
                                          await refetch();
                                        } catch (e) {
                                          addToast({
                                            message:
                                              e.message || "Update failed",
                                            type: "error",
                                          });
                                        }
                                      }}
                                      className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                                    >
                                      Bundle
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newRoom = window.prompt(
                                        "Room",
                                        s.room || "",
                                      );
                                      if (newRoom === null) return;
                                      try {
                                        const res = await updateClassSession({
                                          variables: {
                                            id: s.id,
                                            room: newRoom || null,
                                          },
                                        });
                                        const errors =
                                          res.data?.updateClassSession
                                            ?.errors || [];
                                        if (errors.length)
                                          throw new Error(errors.join(", "));
                                        addToast({
                                          message: "Session updated",
                                          type: "success",
                                        });
                                        await refetch();
                                      } catch (e) {
                                        addToast({
                                          message: e.message || "Update failed",
                                          type: "error",
                                        });
                                      }
                                    }}
                                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                                  >
                                    Room
                                  </button>
                                </>
                              )}

                              {canDeleteSessions(currentUser) && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm("Cancel this session?"))
                                      return;
                                    try {
                                      const res = await deleteClassSession({
                                        variables: { id: s.id },
                                      });
                                      const payload =
                                        res.data?.deleteClassSession;
                                      if (!payload?.success)
                                        throw new Error(
                                          (
                                            payload?.errors || ["Cancel failed"]
                                          ).join(", "),
                                        );
                                      addToast({
                                        message: "Session cancelled",
                                        type: "success",
                                      });
                                      await refetch();
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
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {showNewEventModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeNewEventModal()}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeNewEventModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  New event
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-50">
                  Schedule a session
                </div>
              </div>
              <button
                type="button"
                onClick={() => closeNewEventModal()}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {viewMode === "week" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    value={newEventDayKey || ""}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!next) return;
                      setNewEventDayKey(next);
                    }}
                  />
                </div>
              )}

              {newEventDayKey && (
                <div className="text-xs text-slate-400">
                  {dateFromLocalDayKey(newEventDayKey)?.toLocaleDateString(
                    undefined,
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Class template
                </label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={newEventForm.classTemplateId}
                  onChange={(e) =>
                    setNewEventForm((f) => ({
                      ...f,
                      classTemplateId: e.target.value,
                    }))
                  }
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    value={newEventForm.time}
                    onChange={(e) =>
                      setNewEventForm((f) => ({ ...f, time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Capacity (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    value={newEventForm.capacity}
                    onChange={(e) =>
                      setNewEventForm((f) => ({
                        ...f,
                        capacity: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Room (optional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={newEventForm.room}
                  onChange={(e) =>
                    setNewEventForm((f) => ({ ...f, room: e.target.value }))
                  }
                />
              </div>

              {(userIsOwner || userIsStaff || userIsInstructor) && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Bundles
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={newEventForm.bundleEnabled}
                        onChange={(e) =>
                          setNewEventForm((f) => ({
                            ...f,
                            bundleEnabled: e.target.checked,
                          }))
                        }
                      />
                      Allow bundle credits
                    </label>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">
                        Bundle spots
                      </label>
                      <input
                        type="number"
                        min="1"
                        disabled={!newEventForm.bundleEnabled}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                        value={newEventForm.bundleSpots}
                        onChange={(e) =>
                          setNewEventForm((f) => ({
                            ...f,
                            bundleSpots: e.target.value,
                          }))
                        }
                      />
                      <p className="text-[11px] text-slate-500">
                        How many seats can be booked using bundle credits.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeNewEventModal()}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!newEventDayKey) throw new Error("No day selected");
                      if (!newEventForm.classTemplateId)
                        throw new Error("Class template is required");
                      if (!newEventForm.time)
                        throw new Error("Time is required");

                      await createSessionForDayAndTime({
                        dayKey: newEventDayKey,
                        classTemplateId: newEventForm.classTemplateId,
                        time: newEventForm.time,
                        capacity: newEventForm.capacity,
                        room: newEventForm.room,
                        bundleEnabled: newEventForm.bundleEnabled,
                        bundleSpots: newEventForm.bundleSpots,
                      });
                      addToast({ message: "Session created", type: "success" });
                      closeNewEventModal();
                      await refetch();
                    } catch (err) {
                      addToast({
                        message: err.message || "Failed to create session",
                        type: "error",
                      });
                    }
                  }}
                  className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "month" && hoveredSession && (
        <div
          className="fixed z-50 w-72 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-xl shadow-black/35 backdrop-blur"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y + 12,
            pointerEvents: "none",
          }}
        >
          <div className="text-sm font-semibold text-slate-50">
            {hoveredSession.classTemplate?.title || "Class"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-300">
            {formatTimeRange(
              hoveredSession.startTime,
              hoveredSession.endTime ||
                new Date(
                  new Date(hoveredSession.startTime).getTime() +
                    durationMinutesForSession(hoveredSession) * 60000,
                ).toISOString(),
            )}
            {" · "}
            {new Date(hoveredSession.startTime).toLocaleDateString()}
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-slate-200">
            {hoveredSession.instructor?.name && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Instructor</span>
                <span className="truncate">
                  {hoveredSession.instructor.name}
                </span>
              </div>
            )}
            {hoveredSession.room && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Room</span>
                <span className="truncate">{hoveredSession.room}</span>
              </div>
            )}
            {typeof hoveredSession.capacity === "number" && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Capacity</span>
                <span>{hoveredSession.capacity}</span>
              </div>
            )}
            {typeof hoveredSession.seatsAvailable === "number" && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Seats left</span>
                <span>{hoveredSession.seatsAvailable}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
