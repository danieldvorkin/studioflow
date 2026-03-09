import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import {
  CLASS_TEMPLATES,
  CLASS_SESSIONS,
  INSTRUCTORS,
  MY_STUDIO,
} from "../../../apollo/queries";
import {
  CREATE_CLASS_TEMPLATE,
  UPDATE_CLASS_TEMPLATE,
  DELETE_CLASS_TEMPLATE,
  APPROVE_CLASS_TEMPLATE,
} from "../../../apollo/mutations";
import { useToast } from "../../../components/shared/ToastProvider";
import { useLocationContext } from "../../../location/LocationProvider";
import { useAuth } from "../../../auth/AuthProvider";
import {
  isInstructor as isInstructorUser,
  isOwner,
  isStaff,
} from "../../../auth/permissions";

function ClassPreviewModal({
  template,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  canApprove,
  studioCode,
}) {
  const [shareCopied, setShareCopied] = useState(false);

  const { data: sessionsData, loading: sessionsLoading } = useQuery(
    CLASS_SESSIONS,
    {
      variables: { from: null, to: null },
      skip: !template,
      fetchPolicy: "cache-and-network",
    },
  );

  useEffect(() => {
    if (!template) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [template, onClose]);

  if (!template) return null;

  const now = new Date();
  const sessions = (sessionsData?.classSessions || [])
    .filter(
      (s) => s.classTemplate?.id === template.id && new Date(s.startTime) > now,
    )
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  const priceDisplay =
    template.priceCents != null
      ? `${(template.currency || "cad").toUpperCase()} ${(template.priceCents / 100).toFixed(2)}`
      : null;

  const handleShare = () => {
    if (!studioCode) return;
    const url = `${window.location.origin}/c/${studioCode}/${template.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close preview"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-sky-400">
              Client preview
            </span>
            <span className="text-sm text-slate-400">— what clients see</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {/* Client-facing hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 px-6 py-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl" />
            <div className="relative">
              <h1 className="text-2xl font-bold tracking-tight text-slate-50">
                {template.title}
              </h1>
              {template.description && (
                <p className="mt-2 text-sm leading-relaxed text-slate-300 max-w-lg">
                  {template.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {template.instructor?.name && (
                  <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500/20 text-[9px] text-sky-300">
                      ✦
                    </span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.instructor.name}
                    </span>
                  </div>
                )}
                {template.durationMinutes && (
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5">
                    <span className="text-[11px] text-slate-400">⏱</span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.durationMinutes} min
                    </span>
                  </div>
                )}
                {priceDisplay && (
                  <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5">
                    <span className="text-xs font-bold text-sky-300">
                      {priceDisplay}
                    </span>
                    <span className="text-[10px] text-sky-400/60">
                      / session
                    </span>
                  </div>
                )}
                {template.capacity && (
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5">
                    <span className="text-[11px] text-slate-400">👥</span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.capacity} spots max
                    </span>
                  </div>
                )}
                {template.studioLocation?.name && (
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5">
                    <span className="text-[11px] text-slate-400">📍</span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.studioLocation.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming sessions preview */}
          <div className="px-6 py-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-200">
              Upcoming sessions
            </h2>
            {sessionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
                <p className="text-sm text-slate-400">
                  No upcoming sessions scheduled yet.
                </p>
                <Link
                  to={`/templates/${template.id}/sessions`}
                  onClick={onClose}
                  className="mt-2 inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Add sessions →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => {
                  const d = new Date(s.startTime);
                  const weekday = d.toLocaleDateString(undefined, {
                    weekday: "short",
                  });
                  const dateNum = d.toLocaleDateString(undefined, {
                    day: "numeric",
                  });
                  const month = d.toLocaleDateString(undefined, {
                    month: "short",
                  });
                  const time = d.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const soldOut =
                    typeof s.seatsAvailable === "number" &&
                    s.seatsAvailable <= 0;

                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-1.5 py-1 text-center">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {weekday}
                          </span>
                          <span className="text-base font-bold leading-tight text-slate-50">
                            {dateNum}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {month}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-50">
                            {time}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            {s.instructor?.name && (
                              <span>{s.instructor.name}</span>
                            )}
                            {s.room && <span>· Room {s.room}</span>}
                            {!soldOut &&
                              typeof s.seatsAvailable === "number" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                                  {s.seatsAvailable} spot
                                  {s.seatsAvailable !== 1 ? "s" : ""} left
                                </span>
                              )}
                            {soldOut && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                                Waitlist open
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white opacity-60 cursor-default">
                          Book now
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Owner action bar */}
        <div className="border-t border-slate-800 bg-slate-900/80 px-6 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Owner actions
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              ✎ Edit details
            </button>
            <Link
              to={`/templates/${template.id}/sessions`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
            >
              📅 View sessions
            </Link>
            {studioCode && (
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/60 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition"
              >
                {shareCopied ? "✓ Link copied!" : "↱ Share public link"}
              </button>
            )}
            {studioCode && (
              <a
                href={`/c/${studioCode}/${template.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                ↗ Open public page
              </a>
            )}
            {canApprove && template && !template.approved && (
              <button
                type="button"
                onClick={() => {
                  onApprove(template.id, true);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                ✓ Approve class
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-rose-600/60 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-600/10 transition"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Templates() {
  useDocumentTitle("Class Templates");
  const { locationId } = useLocationContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userIsOwner = isOwner(user);
  const userIsStaff = isStaff(user);
  const userIsInstructor = isInstructorUser(user);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const { data, loading, error } = useQuery(CLASS_TEMPLATES, {
    variables: { studioLocationId: locationId || null },
  });
  const { data: instructorsData } = useQuery(INSTRUCTORS, {
    skip: !(userIsOwner || userIsStaff),
  });
  const { data: studioData } = useQuery(MY_STUDIO, {
    skip: !(userIsOwner || userIsStaff),
  });
  const studioCode = studioData?.myStudio?.inviteCode;
  const [createTemplate] = useMutation(CREATE_CLASS_TEMPLATE, {
    refetchQueries: [{ query: CLASS_TEMPLATES }],
  });
  const [updateTemplate] = useMutation(UPDATE_CLASS_TEMPLATE);
  const [deleteTemplate] = useMutation(DELETE_CLASS_TEMPLATE);
  const [approveTemplate] = useMutation(APPROVE_CLASS_TEMPLATE);
  const { addToast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    capacity: "",
    durationMinutes: "",
    priceDollars: "",
    instructorId: "",
    currency: "cad",
  });
  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    capacity: "",
    durationMinutes: "",
    priceDollars: "",
    instructorId: "",
    currency: "cad",
  });

  if (loading)
    return <p className="text-sm text-slate-400">Loading classes…</p>;
  if (error)
    return <p className="text-sm text-rose-400">Error loading classes</p>;

  const templates = data?.classTemplates || [];
  const instructors = instructorsData?.instructors || [];

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      title: t.title || "",
      description: t.description || "",
      capacity: t.capacity || "",
      durationMinutes: t.durationMinutes || "",
      priceDollars:
        t.priceCents != null ? String((t.priceCents / 100).toFixed(2)) : "",
      instructorId: userIsInstructor ? user?.id : t.instructor?.id || "",
      currency: t.currency || "cad",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitEdit = async (id) => {
    try {
      const res = await updateTemplate({
        variables: {
          id,
          title: editForm.title,
          description: editForm.description,
          capacity: editForm.capacity ? Number(editForm.capacity) : null,
          durationMinutes: editForm.durationMinutes
            ? Number(editForm.durationMinutes)
            : null,
          priceCents: editForm.priceDollars
            ? Math.round(Number(editForm.priceDollars) * 100)
            : null,
          instructorId: editForm.instructorId || null,
          currency: editForm.currency || "cad",
        },
      });
      const payload = res.data?.updateClassTemplate;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.classTemplate) {
        throw new Error(errors.join(", ") || "Could not update class");
      }
      addToast({ message: "Class updated", type: "success" });
      setEditingId(null);
    } catch (e) {
      addToast({ message: e.message || "Update failed", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class? This cannot be undone.")) return;
    try {
      const res = await deleteTemplate({ variables: { id } });
      const payload = res.data?.deleteClassTemplate;
      if (!payload?.success) {
        throw new Error(
          (payload?.errors || ["Could not delete class"]).join(", "),
        );
      }
      addToast({ message: "Class deleted", type: "success" });
    } catch (e) {
      addToast({ message: e.message || "Delete failed", type: "error" });
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      const res = await approveTemplate({ variables: { id, approved } });
      const payload = res.data?.approveClassTemplate;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.classTemplate) {
        throw new Error(errors.join(", ") || "Could not update approval");
      }
      addToast({
        message: approved
          ? "Class approved"
          : "Class rejected and moved to pending",
        type: "success",
      });
    } catch (e) {
      addToast({ message: e.message || "Action failed", type: "error" });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          {userIsInstructor ? "My Classes" : "Classes"}
        </h1>
        <p className="text-sm text-slate-400">
          {userIsInstructor
            ? "Your assigned and requested classes. New submissions require owner approval before going live."
            : "Classes you can schedule into sessions."}
        </p>
      </header>

      {/* section to add new template */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-sm shadow-black/20">
        <h2 className="text-sm font-semibold text-slate-50">Add new class</h2>
        {userIsInstructor && (
          <p className="mt-1 text-[11px] text-amber-400/80">
            ⚠ New class requests require owner approval before they become
            visible to clients.
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Title</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.title}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Instructor
            </label>
            {userIsOwner || userIsStaff ? (
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                value={newForm.instructorId}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, instructorId: e.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name || i.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950/20 px-3 py-2 text-sm text-slate-200">
                {user?.name || user?.email || "You"}
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Description
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              rows={2}
              value={newForm.description}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Capacity
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.capacity}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, capacity: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Duration (min)
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.durationMinutes}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, durationMinutes: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Price</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.priceDollars}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, priceDollars: e.target.value }))
              }
            />
            <p className="text-[11px] text-slate-500">
              Amount charged when booking this class.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Currency
            </label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.currency}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, currency: e.target.value }))
              }
            >
              <option value="cad">CAD</option>
              <option value="usd">USD</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await createTemplate({
                variables: {
                  title: newForm.title || "New class",
                  description: newForm.description || null,
                  capacity: newForm.capacity ? Number(newForm.capacity) : null,
                  durationMinutes: newForm.durationMinutes
                    ? Number(newForm.durationMinutes)
                    : null,
                  priceCents: newForm.priceDollars
                    ? Math.round(Number(newForm.priceDollars) * 100)
                    : null,
                  instructorId: newForm.instructorId || null,
                  studioLocationId: locationId || null,
                  currency: newForm.currency || "cad",
                },
              });
              const payload = res.data?.createClassTemplate;
              const errors = payload?.errors || [];
              if (errors.length || !payload?.classTemplate) {
                throw new Error(errors.join(", ") || "Could not create class");
              }
              addToast({ message: "Class created", type: "success" });
              navigate(`/classes/${payload.classTemplate.id}`);
            } catch (e) {
              addToast({
                message: e.message || "Creation failed",
                type: "error",
              });
            }
          }}
          className="mt-3 inline-flex items-center rounded-full bg-sky-500 px-3 py-1 font-semibold text-on-accent hover:bg-sky-400"
        >
          Add template
        </button>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <article
            key={t.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-sm shadow-black/20"
          >
            {editingId === t.id ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Title
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Description
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Instructor
                  </label>
                  {userIsOwner || userIsStaff ? (
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.instructorId}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          instructorId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {instructors.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name || i.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/20 px-3 py-2 text-sm text-slate-200">
                      {user?.name || user?.email || "You"}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Capacity
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.capacity}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, capacity: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.durationMinutes}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          durationMinutes: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.priceDollars}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          priceDollars: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Currency
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.currency}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, currency: e.target.value }))
                      }
                    >
                      <option value="cad">CAD</option>
                      <option value="usd">USD</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitEdit(t.id)}
                    className="rounded-full bg-sky-500 px-3 py-1 font-semibold text-on-accent hover:bg-sky-400"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(t)}
                      className="text-left text-sm font-semibold text-slate-50 hover:text-sky-300 transition-colors"
                    >
                      {t.title}
                    </button>
                    {!t.approved && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                        Pending approval
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-400">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span>Capacity: {t.capacity}</span>
                    <span>• Duration: {t.durationMinutes} min</span>
                    <span>
                      • Price:{" "}
                      {t.priceCents
                        ? `${(t.currency || "cad").toUpperCase()} ${(t.priceCents / 100).toFixed(2)}`
                        : "Not set"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>Location: {t.studioLocation?.name || "—"}</span>
                    <span>
                      Instructor:{" "}
                      {t.instructor?.name || t.instructor?.email || "—"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(t)}
                      className="rounded-full border border-violet-500/60 bg-violet-500/10 px-3 py-1 font-semibold text-violet-300 hover:bg-violet-500/20"
                    >
                      Preview
                    </button>
                    {/* Approve / reject — owners, moderators, godmode only */}
                    {(userIsOwner || (!userIsInstructor && !userIsStaff)) &&
                      !t.approved && (
                        <button
                          type="button"
                          onClick={() => handleApprove(t.id, true)}
                          className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          Approve
                        </button>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Instructors can only delete their own un-approved classes */}
                    {(!userIsInstructor || !t.approved) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="rounded-full border border-rose-600/60 px-3 py-1 text-rose-200 hover:bg-rose-600/10"
                      >
                        Delete
                      </button>
                    )}
                    <Link
                      to={`/templates/${t.id}/sessions`}
                      className="inline-flex items-center rounded-full border border-sky-500/70 px-3 py-1 font-semibold text-sky-200 hover:bg-sky-500/10"
                    >
                      Sessions
                    </Link>
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </div>

      <ClassPreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onEdit={() => previewTemplate && startEdit(previewTemplate)}
        onDelete={() => previewTemplate && handleDelete(previewTemplate.id)}
        onApprove={handleApprove}
        canApprove={userIsOwner}
        studioCode={studioCode}
      />
    </div>
  );
}
