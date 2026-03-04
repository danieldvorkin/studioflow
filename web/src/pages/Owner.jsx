import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CURRENT_USER,
  ALL_USERS,
  BOOKINGS,
  CLIENTS,
  PAYMENT_SETTINGS,
  PAYMENTS,
  STUDIO_SETTINGS,
  STUDIOS,
} from "../apollo/queries";
import {
  UPDATE_USER,
  CANCEL_BOOKING,
  UPDATE_PAYMENT_SETTINGS,
  START_IMPERSONATION,
  INVITE_USER,
} from "../apollo/mutations";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../auth/AuthProvider";
import { useTheme } from "../theme/ThemeProvider";
import InstructorOnboardingWizard from "../components/InstructorOnboardingWizard";

const OWNER_PAGE_LAYOUT_STORAGE_PREFIX = "owner.pageLayout.v1";
const DEFAULT_MODULE_MIN_HEIGHT = 240;
const DEFAULT_MODULE_MAX_HEIGHT = 900;
const GRID_ROW_PX = 10;
const GRID_GAP_PX = 12;
const DEFAULT_MODULE_HEIGHT = 320;

export default function Owner() {
  useDocumentTitle("Studio Settings");
  const navigate = useNavigate();
  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;
  const auth = useAuth();
  const [selectedOwnerByStudioId, setSelectedOwnerByStudioId] = useState({});

  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";
  const showGodmodeOwnerPicker = isGodmode && !auth.isImpersonating;

  const { data: studiosData, loading: studiosLoading } = useQuery(STUDIOS, {
    skip: !showGodmodeOwnerPicker,
    fetchPolicy: "cache-and-network",
  });

  const { data, loading, refetch } = useQuery(ALL_USERS, {
    skip: !user,
  });
  const {
    data: bookingsData,
    loading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery(BOOKINGS, {
    skip: !user || showGodmodeOwnerPicker,
  });
  const { data: clientsData, loading: clientsLoading } = useQuery(CLIENTS, {
    skip: !user || showGodmodeOwnerPicker,
  });
  const { data: paymentSettingsData } = useQuery(PAYMENT_SETTINGS, {
    skip: !user || showGodmodeOwnerPicker,
  });
  const { data: paymentsData, loading: paymentsLoading } = useQuery(PAYMENTS, {
    skip: !user || showGodmodeOwnerPicker,
  });

  const [updateUser] = useMutation(UPDATE_USER);
  const [inviteUser] = useMutation(INVITE_USER);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [updatePaymentSettings] = useMutation(UPDATE_PAYMENT_SETTINGS);
  const [startImpersonation] = useMutation(START_IMPERSONATION);

  const { addToast } = useToast();
  const { applyTheme, clearThemeOverride } = useTheme();

  if (userLoading || (!user && !userLoading)) {
    return <div className="text-sm text-slate-300">Loading account…</div>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  if (showGodmodeOwnerPicker) {
    const studios = studiosData?.studios || [];
    const studioNameById = Object.fromEntries(
      studios.map((s) => [s.id?.toString?.() || s.id, s.name]),
    );

    const allUsers = data?.users || [];
    const owners = allUsers
      .filter((u) => {
        const rn = (u?.roleName || "").toString().toLowerCase();
        const email = (u?.email || "").toString().trim().toLowerCase();
        if (!email) return false;
        if (rn === "godmode") return false;
        if (email === "dvorkin212@gmail.com") return false;
        return rn === "owner" || u?.role === 0;
      })
      .sort((a, b) => {
        const aStudio =
          studioNameById[a?.studioId?.toString?.() || a?.studioId] || "";
        const bStudio =
          studioNameById[b?.studioId?.toString?.() || b?.studioId] || "";
        const studioCmp = aStudio.localeCompare(bStudio);
        if (studioCmp !== 0) return studioCmp;
        return (a?.email || "").localeCompare(b?.email || "");
      });

    const ownersByStudioId = owners.reduce((acc, owner) => {
      const sid = owner?.studioId?.toString?.() || owner?.studioId;
      if (!sid) return acc;
      acc[sid] ||= [];
      acc[sid].push(owner);
      return acc;
    }, {});

    const studioIds = Object.keys(ownersByStudioId).sort((a, b) => {
      const aName = studioNameById[a] || "";
      const bName = studioNameById[b] || "";
      const nameCmp = aName.localeCompare(bName);
      if (nameCmp !== 0) return nameCmp;
      return a.localeCompare(b);
    });

    return (
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Godmode
          </h1>
          <p className="text-sm text-slate-400">
            Select a studio owner to open their owner workspace.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
              Owners
            </h2>
            <div className="text-xs text-slate-500">
              {studiosLoading || loading
                ? "Loading…"
                : `${owners.length} owner${owners.length === 1 ? "" : "s"}`}
            </div>
          </div>

          {studioIds.length === 0 && !loading ? (
            <div className="text-sm text-slate-300">No owners found.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="grid grid-cols-12 gap-0 bg-slate-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400/70">
                <div className="col-span-5">Studio</div>
                <div className="col-span-4">Owner</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              <div className="divide-y divide-slate-800">
                {studioIds.map((studioId) => {
                  const studioLabel =
                    studioNameById[studioId] || `Studio ${studioId}`;
                  const studioOwners = ownersByStudioId[studioId] || [];
                  const selectedOwnerId =
                    selectedOwnerByStudioId[studioId] || "";
                  const selectedOwner =
                    studioOwners.find(
                      (o) =>
                        (o.id || "").toString() === selectedOwnerId.toString(),
                    ) || null;

                  return (
                    <div
                      key={studioId}
                      className="grid grid-cols-12 items-center gap-0 px-3 py-3 text-sm"
                    >
                      <div className="col-span-5 min-w-0">
                        <div className="truncate text-slate-100">
                          {studioLabel}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          ID {studioId}
                        </div>
                      </div>

                      <div className="col-span-4 min-w-0">
                        <select
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          value={selectedOwnerId}
                          onChange={(e) =>
                            setSelectedOwnerByStudioId((prev) => ({
                              ...prev,
                              [studioId]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select owner…</option>
                          {studioOwners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name ? `${o.name} (${o.email})` : o.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/owner/studios/${studioId}`)}
                          className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                        >
                          View summary
                        </button>
                        <button
                          type="button"
                          disabled={!selectedOwner}
                          onClick={() =>
                            selectedOwner && handleViewAs(selectedOwner)
                          }
                          className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Open workspace
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  const isOwner = roleName === "owner" || user.role === 0;

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">
          Owner access only
        </h1>
        <p className="text-sm text-slate-400">
          This area is only available to the studio owner.
        </p>
      </div>
    );
  }

  const users = data?.users || [];
  const bookings = bookingsData?.bookings || [];
  const clients = clientsData?.clients || [];
  const payments = paymentsData?.payments || [];
  const paymentSettings = paymentSettingsData?.paymentSettings;

  const handleToggle = async (targetUser, field) => {
    const res = await updateUser({
      variables: {
        id: targetUser.id,
        [field]: !targetUser[field],
      },
    });

    const errors = res.data?.updateUser?.errors || [];
    if (errors.length) {
      addToast({ message: errors.join(", "), type: "error" });
    } else {
      addToast({ message: "User updated", type: "success" });
      refetch();
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const res = await cancelBooking({ variables: { id: bookingId } });
    const payload = res.data?.cancelBooking;

    if (!payload?.success) {
      addToast({
        message: (payload?.errors || ["Could not cancel booking"]).join(", "),
        type: "error",
      });
    } else {
      addToast({ message: "Booking cancelled", type: "success" });
      refetchBookings();
    }
  };

  async function handleViewAs(targetUser) {
    try {
      const res = await startImpersonation({
        variables: { userId: targetUser.id },
      });
      const payload = res.data?.startImpersonation;
      const errors = payload?.errors || [];

      if (!payload?.token || errors.length) {
        addToast({
          message: errors.join(", ") || "Could not start view-as session",
          type: "error",
        });
        return;
      }

      await auth.beginImpersonation(payload.token, payload.user);
      addToast({
        message: `Now viewing as ${payload.user?.name || payload.user?.email || "selected user"}`,
        type: "success",
      });
    } catch (e) {
      addToast({
        message: e.message || "Could not start view-as session",
        type: "error",
      });
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Owner workspace
        </h1>
        <p className="text-sm text-slate-400">
          Manage user roles and availability for your studio.
        </p>
      </header>

      <OwnerModules
        users={users}
        currentUser={user}
        loading={loading}
        refetch={refetch}
        updateUser={updateUser}
        inviteUser={inviteUser}
        handleToggle={handleToggle}
        handleViewAs={handleViewAs}
        paymentSettings={paymentSettings}
        updatePaymentSettings={updatePaymentSettings}
        bookings={bookings}
        bookingsLoading={bookingsLoading}
        handleCancelBooking={handleCancelBooking}
        clients={clients}
        clientsLoading={clientsLoading}
        payments={payments}
        paymentsLoading={paymentsLoading}
        applyTheme={applyTheme}
        clearThemeOverride={clearThemeOverride}
        addToast={addToast}
      />
    </div>
  );
}

function OwnerModules({
  users,
  currentUser,
  loading,
  refetch,
  updateUser,
  inviteUser,
  handleToggle,
  handleViewAs,
  paymentSettings,
  updatePaymentSettings,
  bookings,
  bookingsLoading,
  handleCancelBooking,
  clients,
  clientsLoading,
  payments,
  paymentsLoading,
  applyTheme,
  clearThemeOverride,
  addToast,
}) {
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const [peopleQuery, setPeopleQuery] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(1);
  const [instructorWizardOpen, setInstructorWizardOpen] = useState(false);

  const [layoutInitialized, setLayoutInitialized] = useState(false);
  const [layoutTemplate, setLayoutTemplate] = useState("default");
  const [layoutOrder, setLayoutOrder] = useState([]);
  const [moduleHeights, setModuleHeights] = useState({});
  const [moduleWidths, setModuleWidths] = useState({});

  const lastSavedLayoutRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const layoutStorageKey = `${OWNER_PAGE_LAYOUT_STORAGE_PREFIX}.${currentUser?.id || "unknown"}`;

  const persistToLocalStorage = useCallback(
    (next) => {
      window.localStorage.setItem(layoutStorageKey, JSON.stringify(next));
    },
    [layoutStorageKey],
  );

  const modules = useMemo(
    () => [
      {
        id: "people",
        title: "People",
        defaultWidth: 2,
        defaultHeight: 620,
        render: () => (
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            {(() => {
              const q = (peopleQuery || "").trim().toLowerCase();

              const clientsPageEnabled =
                paymentSettings?.clientsPageEnabled !== false;

              const filteredUsers = q
                ? users.filter((u) =>
                    [
                      u?.name,
                      u?.email,
                      u?.roleName,
                      u?.role != null ? String(u.role) : null,
                    ].some((v) =>
                      (v || "").toString().toLowerCase().includes(q),
                    ),
                  )
                : users;

              const filteredClients = q
                ? clients.filter((c) =>
                    [c?.name, c?.email, c?.phone].some((v) =>
                      (v || "").toString().toLowerCase().includes(q),
                    ),
                  )
                : clients;

              return (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
                      People
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Users: {filteredUsers.length}/{users.length} · Clients:{" "}
                      {filteredClients.length}/{clients.length}
                    </span>
                  </div>

                  <div className="mb-3">
                    <input
                      value={peopleQuery}
                      onChange={(e) => setPeopleQuery(e.target.value)}
                      placeholder="Search users & clients…"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex min-h-0 flex-col rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-3 py-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                          Users
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            {filteredUsers.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInstructorWizardOpen(true)}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 hover:border-sky-400 hover:bg-sky-500/15 transition"
                          >
                            + Add instructor
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteOpen((v) => !v)}
                            className="inline-flex items-center rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                          >
                            Invite user
                          </button>
                        </div>
                      </div>

                      {inviteOpen && (
                        <div className="border-b border-slate-800 bg-slate-900/40 px-3 py-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            <input
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="Email"
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                            <input
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              placeholder="Name (optional)"
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                            <select
                              value={inviteRole}
                              onChange={(e) =>
                                setInviteRole(Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            >
                              <option value={1}>staff</option>
                              <option value={0}>owner</option>
                              <option value={2}>instructor</option>
                            </select>
                            <button
                              type="button"
                              onClick={async () => {
                                const email = (inviteEmail || "").trim();
                                if (!email) {
                                  addToast({
                                    message: "Email is required",
                                    type: "error",
                                  });
                                  return;
                                }

                                try {
                                  const res = await inviteUser({
                                    variables: {
                                      email,
                                      name: (inviteName || "").trim() || null,
                                      role: inviteRole,
                                    },
                                  });

                                  const payload = res.data?.inviteUser;
                                  const errors = payload?.errors || [];

                                  if (errors.length) {
                                    addToast({
                                      message: errors.join(", "),
                                      type: "error",
                                    });
                                    return;
                                  }

                                  addToast({
                                    message: "Invite sent",
                                    type: "success",
                                  });
                                  setInviteEmail("");
                                  setInviteName("");
                                  setInviteRole(1);
                                  setInviteOpen(false);
                                  refetch();
                                } catch (e) {
                                  addToast({
                                    message:
                                      e.message || "Could not invite user",
                                    type: "error",
                                  });
                                }
                              }}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:border-sky-400 hover:text-sky-300"
                            >
                              Send invite
                            </button>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">
                            Creates the account in your studio and emails a
                            password setup link.
                          </p>
                        </div>
                      )}

                      <div className="min-h-0 flex-1 overflow-auto">
                        {loading && (
                          <p className="p-3 text-sm text-slate-400">
                            Loading users…
                          </p>
                        )}
                        {!loading && filteredUsers.length === 0 && (
                          <p className="p-3 text-sm text-slate-500">
                            No users match your search.
                          </p>
                        )}

                        {!loading && filteredUsers.length > 0 && (
                          <table className="min-w-full text-left text-xs text-slate-300">
                            <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Role</th>
                                <th className="px-3 py-2">Active</th>
                                <th className="px-3 py-2">Available</th>
                                <th className="px-3 py-2 text-right">
                                  View as
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredUsers.map((u) => (
                                <tr
                                  key={u.id}
                                  className="border-t border-slate-800"
                                >
                                  <td className="px-3 py-2 text-slate-50">
                                    {u.name || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400">
                                    {u.email}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {u.id === currentUser.id ? (
                                      <span className="uppercase">
                                        {u.roleName}
                                      </span>
                                    ) : (
                                      <select
                                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                        value={u.role}
                                        onChange={async (e) => {
                                          const res = await updateUser({
                                            variables: {
                                              id: u.id,
                                              role: Number(e.target.value),
                                            },
                                          });
                                          const errors =
                                            res.data?.updateUser?.errors || [];
                                          if (errors.length) {
                                            addToast({
                                              message: errors.join(", "),
                                              type: "error",
                                            });
                                          } else {
                                            addToast({
                                              message: "Role updated",
                                              type: "success",
                                            });
                                            refetch();
                                          }
                                        }}
                                      >
                                        <option value={0}>owner</option>
                                        <option value={1}>staff</option>
                                        <option value={2}>instructor</option>
                                        <option value={3}>client</option>
                                      </select>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggle(u, "active")}
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${u.active ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
                                    >
                                      {u.active ? "Active" : "Inactive"}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggle(u, "availableForSessions")
                                      }
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${u.availableForSessions ? "bg-sky-500/10 text-sky-300" : "bg-slate-800 text-slate-400"}`}
                                    >
                                      {u.availableForSessions
                                        ? "Available"
                                        : "Unavailable"}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {u.id !== currentUser.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleViewAs(u)}
                                        className="inline-flex items-center rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                                      >
                                        View as
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-col rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-3 py-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                          Clients
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                            <input
                              type="checkbox"
                              checked={clientsPageEnabled}
                              onChange={async (e) => {
                                const next = Boolean(e.target.checked);

                                try {
                                  const res = await updatePaymentSettings({
                                    variables: { clientsPageEnabled: next },
                                    refetchQueries: [
                                      PAYMENT_SETTINGS,
                                      STUDIO_SETTINGS,
                                    ],
                                  });
                                  const payload =
                                    res.data?.updatePaymentSettings;
                                  const errors = payload?.errors || [];
                                  if (errors.length)
                                    throw new Error(errors.join(", "));

                                  addToast({
                                    message: next
                                      ? "Clients page shown"
                                      : "Clients page hidden",
                                    type: "success",
                                  });
                                } catch (err) {
                                  addToast({
                                    message: err.message || "Update failed",
                                    type: "error",
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                            />
                            Show page
                          </label>
                          <span className="text-[11px] text-slate-500">
                            {filteredClients.length}
                          </span>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto">
                        {clientsLoading && (
                          <p className="p-3 text-xs text-slate-400">
                            Loading clients…
                          </p>
                        )}
                        {!clientsLoading && filteredClients.length === 0 && (
                          <p className="p-3 text-xs text-slate-500">
                            No clients match your search.
                          </p>
                        )}

                        {!clientsLoading && filteredClients.length > 0 && (
                          <table className="min-w-full text-left text-xs text-slate-300">
                            <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Phone</th>
                                <th className="px-3 py-2">Login</th>
                                <th className="px-3 py-2 text-right">
                                  View as
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredClients.map((c) => (
                                <tr
                                  key={c.id}
                                  className="border-t border-slate-800"
                                >
                                  <td className="px-3 py-2 text-slate-50">
                                    {c.name || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400">
                                    {c.email || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400">
                                    {c.phone || "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {c.user?.id ? (
                                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                        No
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {c.user?.id &&
                                    c.user.id !== currentUser.id ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleViewAs({ id: c.user.id })
                                        }
                                        className="inline-flex items-center rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                                      >
                                        View as
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-slate-500">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ),
      },
      {
        id: "appearance",
        title: "Studio appearance",
        defaultWidth: 1,
        defaultHeight: 300,
        render: () => (
          <StudioAppearanceModule
            paymentSettings={paymentSettings}
            updatePaymentSettings={updatePaymentSettings}
            addToast={addToast}
            applyTheme={applyTheme}
            clearThemeOverride={clearThemeOverride}
          />
        ),
      },
      {
        id: "stripe",
        title: "Stripe payments",
        defaultWidth: 1,
        defaultHeight: 520,
        render: () => (
          <StripePaymentsModule
            paymentSettings={paymentSettings}
            updatePaymentSettings={updatePaymentSettings}
            addToast={addToast}
          />
        ),
      },
      {
        id: "bookings",
        title: "Bookings",
        defaultWidth: 1,
        defaultHeight: 320,
        render: () => (
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Bookings
              </h2>
              <span className="text-[11px] text-slate-500">
                {bookings.length}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              {bookingsLoading && (
                <p className="text-xs text-slate-400">Loading bookings…</p>
              )}
              {!bookingsLoading && bookings.length === 0 && (
                <p className="text-xs text-slate-500">No bookings yet.</p>
              )}
              {!bookingsLoading && bookings.length > 0 && (
                <ul className="flex h-full flex-col gap-1 overflow-auto">
                  {bookings.slice(0, 50).map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-50">
                          {b.client.name} →{" "}
                          {b.classSession.classTemplate?.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(b.classSession.startTime).toLocaleString()}{" "}
                          · {b.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(b.id)}
                        className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-rose-600/80 hover:text-rose-50"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "payments",
        title: "Recent payments",
        defaultWidth: 1,
        defaultHeight: 320,
        render: () => (
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Recent payments
              </h2>
              <span className="text-[11px] text-slate-500">
                {payments.length}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              {paymentsLoading && (
                <p className="text-xs text-slate-400">Loading payments…</p>
              )}
              {!paymentsLoading && payments.length === 0 && (
                <p className="text-xs text-slate-500">
                  No payments recorded yet.
                </p>
              )}
              {!paymentsLoading && payments.length > 0 && (
                <ul className="flex h-full flex-col gap-1 overflow-auto">
                  {payments.slice(0, 80).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-50">
                          {p.client?.name || p.client?.email || "Client"} →{" "}
                          {p.classSession?.classTemplate?.title || "Class"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleString()} · $
                          {(p.amountCents / 100).toFixed(2)}{" "}
                          {p.currency.toUpperCase()} · {p.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ),
      },
    ],
    [
      users,
      currentUser,
      loading,
      peopleQuery,
      inviteOpen,
      inviteEmail,
      inviteName,
      inviteRole,
      inviteUser,
      updateUser,
      handleToggle,
      handleViewAs,
      paymentSettings,
      updatePaymentSettings,
      bookings,
      bookingsLoading,
      handleCancelBooking,
      clients,
      clientsLoading,
      payments,
      paymentsLoading,
      applyTheme,
      clearThemeOverride,
      addToast,
      refetch,
    ],
  );

  const modulesById = useMemo(() => {
    const entries = modules.map((m) => [m.id, m]);
    return Object.fromEntries(entries);
  }, [modules]);

  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);
  const moduleIdsKey = useMemo(() => moduleIds.join("|"), [moduleIds]);

  useEffect(() => {
    if (layoutInitialized) return;

    if (!paymentSettings) return;

    const coerceLayout = (raw) => {
      if (!raw || typeof raw !== "object") return null;

      const template = raw.template === "custom" ? "custom" : "default";
      const rawOrder = Array.isArray(raw.order)
        ? raw.order.filter((id) => typeof id === "string")
        : [];
      const order = [
        ...new Set(
          rawOrder.map((id) =>
            id === "users" || id === "clients" ? "people" : id,
          ),
        ),
      ];

      const rawHeights =
        raw.heights && typeof raw.heights === "object" ? raw.heights : {};
      const rawWidths =
        raw.widths && typeof raw.widths === "object" ? raw.widths : {};

      const heights = { ...rawHeights };
      const widths = { ...rawWidths };

      if (
        heights.people == null &&
        (heights.users != null || heights.clients != null)
      ) {
        heights.people = Math.max(
          Number(heights.users) || 0,
          Number(heights.clients) || 0,
        );
      }
      if (
        widths.people == null &&
        (widths.users != null || widths.clients != null)
      ) {
        widths.people = Math.max(
          Number(widths.users) || 0,
          Number(widths.clients) || 0,
        );
      }

      return {
        version: 1,
        template,
        order,
        heights,
        widths,
      };
    };

    const fromServer = coerceLayout(paymentSettings?.ownerPageLayout);

    let fromLocal = null;
    try {
      const localRaw = window.localStorage.getItem(layoutStorageKey);
      fromLocal = coerceLayout(localRaw ? JSON.parse(localRaw) : null);
    } catch {
      fromLocal = null;
    }

    const initial = fromServer ||
      fromLocal || {
        version: 1,
        template: "default",
        order: [],
        heights: {},
        widths: {},
      };

    setLayoutTemplate(initial.template);
    setLayoutOrder(initial.order);
    setModuleHeights(initial.heights);
    setModuleWidths(initial.widths);
    persistToLocalStorage(initial);

    if (initial.template === "custom") {
      lastSavedLayoutRef.current = JSON.stringify({
        version: 1,
        template: "custom",
        order: initial.order,
        heights: initial.heights,
        widths: initial.widths,
      });
    }

    setLayoutInitialized(true);
  }, [
    layoutInitialized,
    layoutStorageKey,
    moduleIdsKey,
    paymentSettings,
    persistToLocalStorage,
  ]);

  const orderedIds =
    Array.isArray(layoutOrder) && layoutOrder.length
      ? layoutOrder
          .filter((id) => moduleIds.includes(id))
          .concat(moduleIds.filter((id) => !layoutOrder.includes(id)))
      : moduleIds;

  const orderedModules = orderedIds
    .map((id) => modules.find((m) => m.id === id))
    .filter(Boolean);

  const customLayoutPayload = useMemo(
    () => ({
      version: 1,
      template: "custom",
      order: orderedIds,
      heights: moduleHeights || {},
      widths: moduleWidths || {},
    }),
    [orderedIds, moduleHeights, moduleWidths],
  );

  useEffect(() => {
    if (!layoutInitialized) return;
    if (!paymentSettings?.id) return;
    if (layoutTemplate !== "custom") return;

    const json = JSON.stringify(customLayoutPayload);
    if (json === lastSavedLayoutRef.current) return;

    const t = window.setTimeout(async () => {
      try {
        await updatePaymentSettings({
          variables: {
            ownerPageLayout: customLayoutPayload,
          },
          refetchQueries: [PAYMENT_SETTINGS],
        });
        lastSavedLayoutRef.current = json;
      } catch {
        // ignore: we still have localStorage fallback
      }
    }, 650);

    return () => window.clearTimeout(t);
  }, [
    customLayoutPayload,
    layoutInitialized,
    layoutTemplate,
    paymentSettings?.id,
    updatePaymentSettings,
  ]);

  const resetLayout = async () => {
    const cleared = {
      version: 1,
      template: "default",
      order: [],
      heights: {},
      widths: {},
    };
    setLayoutTemplate("default");
    setLayoutOrder([]);
    setModuleHeights({});
    setModuleWidths({});
    persistToLocalStorage(cleared);
    lastSavedLayoutRef.current = null;
    try {
      await updatePaymentSettings({
        variables: {
          ownerPageLayout: {},
        },
        refetchQueries: [PAYMENT_SETTINGS],
      });
      addToast({ message: "Layout reset to default", type: "success" });
    } catch (e) {
      addToast({
        message: e.message || "Could not reset layout",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <InstructorOnboardingWizard
        open={instructorWizardOpen}
        onClose={() => setInstructorWizardOpen(false)}
        onDone={() => {
          refetch();
        }}
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Layout template:{" "}
          <span className="text-slate-200">
            {layoutTemplate === "custom" ? "Saved" : "Default"}
          </span>
        </div>
        <button
          type="button"
          onClick={resetLayout}
          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
        >
          Reset layout
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          setActiveId(event.active?.id ?? null);
        }}
        onDragOver={(event) => {
          setOverId(event.over?.id ?? null);
        }}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
        }}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over) {
            setActiveId(null);
            setOverId(null);
            return;
          }
          if (active.id !== over.id) {
            const oldIndex = orderedIds.indexOf(active.id);
            const newIndex = orderedIds.indexOf(over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
              const nextOrder = arrayMove(orderedIds, oldIndex, newIndex);
              setLayoutTemplate("custom");
              setLayoutOrder(nextOrder);
              const nextLayout = {
                version: 1,
                template: "custom",
                order: nextOrder,
                heights: moduleHeights || {},
                widths: moduleWidths || {},
              };
              persistToLocalStorage(nextLayout);
            }
          }
          setActiveId(null);
          setOverId(null);
        }}
      >
        <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
          <section className="grid grid-cols-1 gap-3 auto-rows-[10px] grid-flow-dense md:grid-cols-2 xl:grid-cols-3">
            {orderedModules.map((m) => {
              const rawHeight = moduleHeights?.[m.id];
              const effectiveHeight =
                typeof rawHeight === "number"
                  ? rawHeight
                  : m.defaultHeight || DEFAULT_MODULE_HEIGHT;
              const rawWidth = moduleWidths?.[m.id];
              const effectiveWidth = Math.max(
                1,
                Math.min(
                  3,
                  typeof rawWidth === "number" ? rawWidth : m.defaultWidth || 1,
                ),
              );

              return (
                <SortableOwnerModule
                  key={m.id}
                  id={m.id}
                  title={m.title}
                  height={effectiveHeight}
                  width={effectiveWidth}
                  isDropTarget={
                    activeId && overId === m.id && activeId !== m.id
                  }
                  onResize={(nextHeight) => {
                    const clamped = Math.max(
                      DEFAULT_MODULE_MIN_HEIGHT,
                      Math.min(DEFAULT_MODULE_MAX_HEIGHT, nextHeight),
                    );
                    const nextHeights = {
                      ...(moduleHeights || {}),
                      [m.id]: clamped,
                    };
                    setLayoutTemplate("custom");
                    setModuleHeights(nextHeights);
                    persistToLocalStorage({
                      version: 1,
                      template: "custom",
                      order: orderedIds,
                      heights: nextHeights,
                      widths: moduleWidths || {},
                    });
                  }}
                  onToggleWidth={() => {
                    const current = moduleWidths?.[m.id] ?? m.defaultWidth ?? 1;
                    const nextWidth = current === 1 ? 2 : 1;
                    const nextWidths = {
                      ...(moduleWidths || {}),
                      [m.id]: nextWidth,
                    };
                    setLayoutTemplate("custom");
                    setModuleWidths(nextWidths);
                    persistToLocalStorage({
                      version: 1,
                      template: "custom",
                      order: orderedIds,
                      heights: moduleHeights || {},
                      widths: nextWidths,
                    });
                  }}
                >
                  {m.render()}
                </SortableOwnerModule>
              );
            })}
          </section>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-sm shadow-black/20">
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
                {modulesById?.[activeId]?.title || "Module"}
              </div>
              <div className="mt-2 text-sm text-slate-200">Moving…</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableOwnerModule({
  id,
  title,
  height,
  width,
  isDropTarget,
  onResize,
  onToggleWidth,
  children,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const effectiveHeight = height || DEFAULT_MODULE_HEIGHT;
  const rowSpan = Math.max(
    1,
    Math.ceil((effectiveHeight + GRID_GAP_PX) / (GRID_ROW_PX + GRID_GAP_PX)),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridRowEnd: `span ${rowSpan}`,
    gridColumnEnd: `span ${Math.max(1, Math.min(3, width || 1))}`,
  };

  return (
    <div ref={setNodeRef} className="h-full" style={style}>
      <div
        className={`relative flex h-full flex-col ${isDragging ? "opacity-50" : ""} ${isDropTarget ? "outline outline-2 outline-dashed outline-slate-500 -outline-offset-2" : ""}`}
      >
        <div className="flex shrink-0 items-center justify-end gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              aria-label={`Move ${title}`}
              title="Drag to move"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                className="opacity-90"
              >
                <path
                  fill="currentColor"
                  d="M7 4h2v2H7V4Zm4 0h2v2h-2V4Zm4 0h2v2h-2V4ZM7 9h2v2H7V9Zm4 0h2v2h-2V9Zm4 0h2v2h-2V9ZM7 14h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2ZM7 19h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWidth?.();
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              aria-label={`Toggle width for ${title}`}
              title={width === 2 ? "Set narrow" : "Set wide"}
            >
              {width === 2 ? (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  className="opacity-90"
                >
                  <path fill="currentColor" d="M7 5h10v14H7V5Zm2 2v10h6V7H9Z" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  className="opacity-90"
                >
                  <path
                    fill="currentColor"
                    d="M4 5h7v14H4V5Zm9 0h7v14h-7V5ZM6 7v10h3V7H6Zm9 0v10h3V7h-3Z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-0 pb-0">
          {children}
        </div>

        <div className="absolute bottom-2 right-2 z-10">
          <ResizeHandle
            onResize={onResize}
            currentHeight={height || DEFAULT_MODULE_HEIGHT}
          />
        </div>
      </div>
    </div>
  );
}

function ResizeHandle({ onResize, currentHeight }) {
  return (
    <button
      type="button"
      className="h-6 w-6 touch-none rounded-md border border-slate-700 bg-slate-900/80 text-[10px] text-slate-300 hover:bg-slate-800"
      title="Drag to resize"
      aria-label="Resize module"
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const step = e.shiftKey ? 60 : 20;
        const delta = e.key === "ArrowDown" ? step : -step;
        onResize(currentHeight + delta);
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof e.currentTarget.setPointerCapture === "function") {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }

        const startY = e.clientY;
        const startHeight = currentHeight ?? DEFAULT_MODULE_MIN_HEIGHT;

        const handleMove = (moveEvent) => {
          const delta = moveEvent.clientY - startY;
          onResize(startHeight + delta);
        };

        const handleUp = () => {
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
      }}
    >
      ↕
    </button>
  );
}

function StripePaymentsModule({
  paymentSettings,
  updatePaymentSettings,
  addToast,
}) {
  const [unlocked, setUnlocked] = useState(false);
  const formRef = useRef(null);
  const publishableKeyRef = useRef(null);

  const lock = () => {
    setUnlocked(false);
    if (formRef.current) {
      try {
        formRef.current.reset();
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
            Stripe payments
          </h2>
          <p className="text-[10px] text-slate-500">
            {unlocked
              ? "Editing enabled"
              : "Locked to prevent accidental changes"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`text-[11px] ${paymentSettings?.configured ? "text-emerald-400" : "text-amber-400"}`}
          >
            {paymentSettings?.configured ? "Configured" : "Not configured"}
          </span>
          {unlocked ? (
            <button
              type="button"
              onClick={lock}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              Lock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUnlocked(true);
                window.setTimeout(
                  () => publishableKeyRef.current?.focus?.(),
                  0,
                );
              }}
              className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
            >
              Unlock
            </button>
          )}
        </div>
      </div>

      <form
        ref={formRef}
        className="min-h-0 flex-1 space-y-2 overflow-auto"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!unlocked) return;

          const formData = new FormData(e.currentTarget);
          const stripePublishableKey =
            formData.get("stripePublishableKey")?.toString() || null;
          const stripeSecretKey =
            formData.get("stripeSecretKey")?.toString() || null;
          const stripeWebhookSecret =
            formData.get("stripeWebhookSecret")?.toString() || null;
          const defaultCurrency =
            formData.get("defaultCurrency")?.toString() || null;
          const enabled = formData.get("enabled") === "on";

          try {
            const res = await updatePaymentSettings({
              variables: {
                stripePublishableKey,
                stripeSecretKey,
                stripeWebhookSecret,
                defaultCurrency,
                enabled,
              },
            });
            const payload = res.data?.updatePaymentSettings;
            const errors = payload?.errors || [];
            if (errors.length || !payload?.paymentSettings) {
              throw new Error(
                errors.join(", ") || "Could not update payment settings",
              );
            }
            addToast({ message: "Stripe settings updated", type: "success" });
            lock();
          } catch (err) {
            addToast({
              message: err.message || "Update failed",
              type: "error",
            });
          }
        }}
      >
        {!unlocked && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-[11px] text-slate-400">
            Click <span className="text-slate-200">Unlock</span> to edit Stripe
            settings.
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Publishable key
          </label>
          <input
            ref={publishableKeyRef}
            name="stripePublishableKey"
            defaultValue={paymentSettings?.stripePublishableKey || ""}
            disabled={!unlocked}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="pk_live_..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Secret key
          </label>
          <input
            name="stripeSecretKey"
            type="password"
            disabled={!unlocked}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="sk_live_..."
          />
          <p className="text-[10px] text-slate-500">
            For security reasons we do not display the saved secret key.
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Webhook secret (optional)
          </label>
          <input
            name="stripeWebhookSecret"
            type="password"
            disabled={!unlocked}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="whsec_..."
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              Currency
            </label>
            <input
              name="defaultCurrency"
              defaultValue={paymentSettings?.defaultCurrency || "cad"}
              disabled={!unlocked}
              className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] uppercase text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <label
            className={`flex items-center gap-1 text-[11px] ${unlocked ? "text-slate-300" : "text-slate-500"}`}
          >
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={paymentSettings?.enabled}
              disabled={!unlocked}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            Enable payments
          </label>
        </div>
        <button
          type="submit"
          disabled={!unlocked}
          className="mt-2 inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Stripe settings
        </button>
      </form>
    </div>
  );
}

function StudioAppearanceModule({
  paymentSettings,
  updatePaymentSettings,
  addToast,
  applyTheme,
  clearThemeOverride,
}) {
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [defaultTheme, setDefaultTheme] = useState("dark");
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!paymentSettings) return;
    if (hydratedRef.current) return;

    setDashboardTitle(
      paymentSettings.dashboardTitle || "Pilates Studio Dashboard",
    );
    setDefaultTheme(
      paymentSettings.defaultTheme === "light" ? "light" : "dark",
    );
    hydratedRef.current = true;
  }, [paymentSettings]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
          Studio appearance
        </h2>
      </div>

      <form
        className="min-h-0 flex-1 space-y-2 overflow-auto"
        onSubmit={async (e) => {
          e.preventDefault();

          try {
            const res = await updatePaymentSettings({
              variables: {
                dashboardTitle: dashboardTitle?.trim()
                  ? dashboardTitle.trim()
                  : null,
                defaultTheme,
              },
              refetchQueries: [PAYMENT_SETTINGS, STUDIO_SETTINGS],
            });
            const payload = res.data?.updatePaymentSettings;
            const errors = payload?.errors || [];
            if (errors.length || !payload?.paymentSettings) {
              throw new Error(
                errors.join(", ") || "Could not update studio settings",
              );
            }

            if (defaultTheme === "light" || defaultTheme === "dark") {
              clearThemeOverride?.();
              applyTheme(defaultTheme);
            }

            addToast({ message: "Studio settings updated", type: "success" });
          } catch (err) {
            addToast({
              message: err.message || "Update failed",
              type: "error",
            });
          }
        }}
      >
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Dashboard title
          </label>
          <input
            name="dashboardTitle"
            value={dashboardTitle}
            onChange={(e) => setDashboardTitle(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="Studio dashboard title"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Default theme
          </label>
          <select
            name="defaultTheme"
            value={defaultTheme}
            onChange={(e) =>
              setDefaultTheme(e.target.value === "light" ? "light" : "dark")
            }
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-2 inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
        >
          Save appearance
        </button>
      </form>
    </div>
  );
}
