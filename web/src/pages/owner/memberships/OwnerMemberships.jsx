import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  MEMBERSHIP_PLANS,
  CLIENT_MEMBERSHIPS,
  CLIENTS,
  CURRENT_USER,
} from "../../../apollo/queries";
import {
  CREATE_MEMBERSHIP_PLAN,
  UPDATE_MEMBERSHIP_PLAN,
  DELETE_MEMBERSHIP_PLAN,
  ENROLL_CLIENT_MEMBERSHIP,
  UPDATE_CLIENT_MEMBERSHIP,
} from "../../../apollo/mutations";
import { useToast } from "../../../components/shared/ToastProvider";
import {
  isOwner,
  isStaff,
  isGodmode,
  isModerator,
} from "../../../auth/permissions";
import { useCurrency } from "../../../currency/CurrencyProvider";

function dollarsFromCents(cents) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollars(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  paused: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/30",
  expired: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
};

const EMPTY_PLAN_FORM = {
  name: "",
  description: "",
  priceDollars: "",
  currency: "cad",
  reformerClassesPerMonth: "",
  matClassesPerMonth: "",
  includesPriorityBooking: false,
  includesEarlyBooking: false,
  privateSessionDiscountPercent: 0,
  guestPassesPerMonth: 0,
  includesRetailDiscount: false,
  minCommitmentMonths: 3,
  autoRenew: true,
  active: false,
  position: 0,
};

function planFormToVars(form) {
  return {
    name: form.name,
    description: form.description || null,
    priceCents: centsFromDollars(form.priceDollars),
    currency: form.currency,
    reformerClassesPerMonth:
      form.reformerClassesPerMonth === "" ||
      form.reformerClassesPerMonth === null
        ? null
        : Number(form.reformerClassesPerMonth),
    matClassesPerMonth:
      form.matClassesPerMonth === "" || form.matClassesPerMonth === null
        ? null
        : Number(form.matClassesPerMonth),
    includesPriorityBooking: !!form.includesPriorityBooking,
    includesEarlyBooking: !!form.includesEarlyBooking,
    privateSessionDiscountPercent:
      Number(form.privateSessionDiscountPercent) || 0,
    guestPassesPerMonth: Number(form.guestPassesPerMonth) || 0,
    includesRetailDiscount: !!form.includesRetailDiscount,
    minCommitmentMonths: Number(form.minCommitmentMonths) || 3,
    autoRenew: !!form.autoRenew,
    active: !!form.active,
    position: Number(form.position) || 0,
  };
}

function planToForm(plan) {
  return {
    name: plan.name || "",
    description: plan.description || "",
    priceDollars: dollarsFromCents(plan.priceCents),
    currency: plan.currency || "cad",
    reformerClassesPerMonth:
      plan.reformerClassesPerMonth == null
        ? ""
        : String(plan.reformerClassesPerMonth),
    matClassesPerMonth:
      plan.matClassesPerMonth == null ? "" : String(plan.matClassesPerMonth),
    includesPriorityBooking: !!plan.includesPriorityBooking,
    includesEarlyBooking: !!plan.includesEarlyBooking,
    privateSessionDiscountPercent: plan.privateSessionDiscountPercent ?? 0,
    guestPassesPerMonth: plan.guestPassesPerMonth ?? 0,
    includesRetailDiscount: !!plan.includesRetailDiscount,
    minCommitmentMonths: plan.minCommitmentMonths ?? 3,
    autoRenew: plan.autoRenew !== false,
    active: !!plan.active,
    position: plan.position ?? 0,
  };
}

function PlanForm({ form, setForm, onSave, onCancel, saving, title }) {
  const field = (key) => ({
    value: form[key],
    onChange: (e) =>
      setForm((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      })),
  });

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Plan Name *
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="e.g. Signature Membership"
            {...field("name")}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Description
          </label>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            rows={2}
            placeholder="Optional description shown to clients"
            {...field("description")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Monthly Price *
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              placeholder="139.00"
              {...field("priceDollars")}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Currency
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            {...field("currency")}
          >
            <option value="cad">CAD</option>
            <option value="usd">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Reformer Classes / Month{" "}
            <span className="text-slate-500">(blank = unlimited)</span>
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="Unlimited"
            {...field("reformerClassesPerMonth")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Mat / Barre / Yoga Classes / Month{" "}
            <span className="text-slate-500">(blank = unlimited)</span>
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            placeholder="Unlimited"
            {...field("matClassesPerMonth")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Private Session Discount (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            {...field("privateSessionDiscountPercent")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Guest Passes / Month
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            {...field("guestPassesPerMonth")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Min. Commitment (months)
          </label>
          <input
            type="number"
            min="1"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            {...field("minCommitmentMonths")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Display Order
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            {...field("position")}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 pt-1">
        {[
          ["includesPriorityBooking", "Priority Booking"],
          ["includesEarlyBooking", "Early Booking Access"],
          ["includesRetailDiscount", "Retail Discount"],
          ["autoRenew", "Auto-Renew"],
          ["active", "Published (visible to clients)"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"
          >
            <input
              type="checkbox"
              className="rounded border-slate-600 bg-slate-800 text-sky-500"
              checked={!!form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.checked }))
              }
            />
            {label}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Plan"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EnrollModal({ plans, clients, onEnroll, onClose }) {
  const { formatPrice } = useCurrency();
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startedAt, setStartedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEnroll = async () => {
    if (!clientId || !planId) return;
    setSaving(true);
    await onEnroll({ clientId, membershipPlanId: planId, startedAt, notes });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="mb-4 text-base font-semibold text-slate-100">
          Enroll Client in Membership
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Client *
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Plan *
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">Select plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.priceCents, p.currency)}/
                  {p.currency?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Notes
            </label>
            <textarea
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleEnroll}
            disabled={saving || !clientId || !planId}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Enrolling…" : "Enroll"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerMembershipsPage() {
  useDocumentTitle("Memberships");
  const { addToast } = useToast();
  const { formatPrice } = useCurrency();

  const { data: userData } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;

  const canManage =
    isGodmode(user) || isOwner(user) || isStaff(user) || isModerator(user);
  const canWrite = isGodmode(user) || isOwner(user) || isStaff(user);

  const {
    data: plansData,
    loading: plansLoading,
    refetch: refetchPlans,
  } = useQuery(MEMBERSHIP_PLANS, {
    skip: !canManage,
    fetchPolicy: "cache-and-network",
  });
  const {
    data: enrollmentsData,
    loading: enrollmentsLoading,
    refetch: refetchEnrollments,
  } = useQuery(CLIENT_MEMBERSHIPS, {
    skip: !canManage,
    fetchPolicy: "cache-and-network",
  });
  const { data: clientsData } = useQuery(CLIENTS, { skip: !canManage });

  const [createPlan] = useMutation(CREATE_MEMBERSHIP_PLAN);
  const [updatePlan] = useMutation(UPDATE_MEMBERSHIP_PLAN);
  const [deletePlan] = useMutation(DELETE_MEMBERSHIP_PLAN);
  const [enrollClient] = useMutation(ENROLL_CLIENT_MEMBERSHIP);
  const [updateEnrollment] = useMutation(UPDATE_CLIENT_MEMBERSHIP);

  const plans = plansData?.membershipPlans || [];
  const enrollments = enrollmentsData?.clientMemberships || [];
  const clients = clientsData?.clients || [];

  // Plan form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_PLAN_FORM);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_PLAN_FORM);

  // Enrollment modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Active tab
  const [tab, setTab] = useState("plans");

  // Filter
  const [filterPlanId, setFilterPlanId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  if (!user) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!canManage) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreatePlan = async () => {
    if (!createForm.name.trim()) {
      addToast({ message: "Plan name is required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await createPlan({ variables: planFormToVars(createForm) });
      const payload = res.data?.createMembershipPlan;
      if (payload?.errors?.length) throw new Error(payload.errors.join(", "));
      addToast({ message: "Plan created", type: "success" });
      setShowCreate(false);
      setCreateForm(EMPTY_PLAN_FORM);
      refetchPlans();
    } catch (e) {
      addToast({
        message: e.message || "Failed to create plan",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (plan) => {
    setEditingPlanId(plan.id);
    setEditForm(planToForm(plan));
  };

  const handleUpdatePlan = async () => {
    setSaving(true);
    try {
      const res = await updatePlan({
        variables: { id: editingPlanId, ...planFormToVars(editForm) },
      });
      const payload = res.data?.updateMembershipPlan;
      if (payload?.errors?.length) throw new Error(payload.errors.join(", "));
      addToast({ message: "Plan updated", type: "success" });
      setEditingPlanId(null);
      refetchPlans();
    } catch (e) {
      addToast({
        message: e.message || "Failed to update plan",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Delete this plan? This cannot be undone.")) return;
    try {
      const res = await deletePlan({ variables: { id } });
      const payload = res.data?.deleteMembershipPlan;
      if (!payload?.success)
        throw new Error((payload?.errors || ["Delete failed"]).join(", "));
      addToast({ message: "Plan deleted", type: "success" });
      refetchPlans();
    } catch (e) {
      addToast({ message: e.message || "Delete failed", type: "error" });
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      const res = await updatePlan({
        variables: { id: plan.id, active: !plan.active },
      });
      const payload = res.data?.updateMembershipPlan;
      if (payload?.errors?.length) throw new Error(payload.errors.join(", "));
      addToast({
        message: plan.active ? "Plan unpublished" : "Plan published",
        type: "success",
      });
      refetchPlans();
    } catch (e) {
      addToast({ message: e.message || "Could not update", type: "error" });
    }
  };

  const handleEnroll = async ({
    clientId,
    membershipPlanId,
    startedAt,
    notes,
  }) => {
    try {
      const res = await enrollClient({
        variables: {
          clientId,
          membershipPlanId,
          startedAt,
          notes: notes || null,
        },
      });
      const payload = res.data?.enrollClientMembership;
      if (payload?.errors?.length) throw new Error(payload.errors.join(", "));
      addToast({ message: "Client enrolled", type: "success" });
      setShowEnrollModal(false);
      refetchEnrollments();
    } catch (e) {
      addToast({ message: e.message || "Enroll failed", type: "error" });
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await updateEnrollment({ variables: { id, status } });
      const payload = res.data?.updateClientMembership;
      if (payload?.errors?.length) throw new Error(payload.errors.join(", "));
      addToast({ message: "Membership updated", type: "success" });
      refetchEnrollments();
    } catch (e) {
      addToast({ message: e.message || "Update failed", type: "error" });
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    if (filterPlanId && e.membershipPlan?.id !== filterPlanId) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Memberships
          </h1>
          <p className="text-sm text-slate-400">
            Auto-renewing monthly plans with a 3-month minimum commitment.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-0">
        {[
          ["plans", "Plans"],
          ["members", `Members (${enrollments.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === key
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PLANS TAB */}
      {tab === "plans" && (
        <div className="flex flex-col gap-4">
          {/* Create toggle */}
          {canWrite && !showCreate && !editingPlanId && (
            <div>
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                + New Plan
              </button>
            </div>
          )}

          {/* Create form */}
          {canWrite && showCreate && !editingPlanId && (
            <PlanForm
              title="Create New Plan"
              form={createForm}
              setForm={setCreateForm}
              onSave={handleCreatePlan}
              onCancel={() => setShowCreate(false)}
              saving={saving}
            />
          )}

          {/* Edit form */}
          {canWrite && editingPlanId && (
            <PlanForm
              title="Edit Plan"
              form={editForm}
              setForm={setEditForm}
              onSave={handleUpdatePlan}
              onCancel={() => setEditingPlanId(null)}
              saving={saving}
            />
          )}

          {/* Plans list */}
          {plansLoading && (
            <p className="text-sm text-slate-400">Loading plans…</p>
          )}
          {!plansLoading && plans.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              No membership plans yet. Click <strong>+ New Plan</strong> to
              create your first one.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-slate-100">
                      {plan.name}
                    </div>
                    <div className="text-xl font-bold text-sky-400 mt-0.5">
                      {formatPrice(plan.priceCents, plan.currency)}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        /mo
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      plan.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-700/50 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {plan.active ? "Published" : "Draft"}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-xs text-slate-400">{plan.description}</p>
                )}

                <ul className="space-y-1 text-xs text-slate-300">
                  <li>
                    🏋️{" "}
                    <strong>
                      {plan.reformerClassesPerMonth == null
                        ? "Unlimited"
                        : plan.reformerClassesPerMonth}
                    </strong>{" "}
                    Reformer classes/mo
                  </li>
                  {(plan.matClassesPerMonth != null ||
                    plan.matClassesPerMonth === null) &&
                    plan.matClassesPerMonth !== undefined && (
                      <li>
                        🧘{" "}
                        <strong>
                          {plan.matClassesPerMonth == null
                            ? "Unlimited"
                            : plan.matClassesPerMonth}
                        </strong>{" "}
                        Mat/Barre/Yoga/mo
                      </li>
                    )}
                  {plan.includesPriorityBooking && <li>⭐ Priority booking</li>}
                  {plan.includesEarlyBooking && (
                    <li>🔓 Early booking access</li>
                  )}
                  {plan.privateSessionDiscountPercent > 0 && (
                    <li>
                      💆 {plan.privateSessionDiscountPercent}% off private
                      sessions
                    </li>
                  )}
                  {plan.guestPassesPerMonth > 0 && (
                    <li>
                      🎟 {plan.guestPassesPerMonth} guest pass
                      {plan.guestPassesPerMonth > 1 ? "es" : ""}/mo
                    </li>
                  )}
                  {plan.includesRetailDiscount && <li>🛍 Retail discount</li>}
                  <li>
                    📅 {plan.minCommitmentMonths}-month minimum •{" "}
                    {plan.autoRenew ? "Auto-renew" : "No auto-renew"}
                  </li>
                </ul>

                <div className="text-xs text-slate-500 mt-auto">
                  {plan.enrolledCount} active member
                  {plan.enrolledCount !== 1 ? "s" : ""}
                </div>

                {canWrite && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      onClick={() => startEdit(plan)}
                      className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className={`rounded border px-2 py-1 text-xs ${
                        plan.active
                          ? "border-amber-600 text-amber-400 hover:bg-amber-600/10"
                          : "border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
                      }`}
                    >
                      {plan.active ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="rounded border border-red-800/60 px-2 py-1 text-xs text-red-400 hover:bg-red-800/10"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab === "members" && (
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {canWrite && (
              <button
                onClick={() => setShowEnrollModal(true)}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                + Enroll Client
              </button>
            )}
            <select
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={filterPlanId}
              onChange={(e) => setFilterPlanId(e.target.value)}
            >
              <option value="">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {["active", "paused", "cancelled", "expired"].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-400 ml-auto">
              {filteredEnrollments.length} result
              {filteredEnrollments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {enrollmentsLoading && (
            <p className="text-sm text-slate-400">Loading…</p>
          )}
          {!enrollmentsLoading && filteredEnrollments.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              No members yet. Click <strong>+ Enroll Client</strong> to add one.
            </div>
          )}

          {filteredEnrollments.length > 0 && (
            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Started</th>
                    <th className="px-4 py-3 text-left">Ends</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-800/50 hover:bg-slate-900/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">
                          {m.client?.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {m.client?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{m.membershipPlan?.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatPrice(
                            m.membershipPlan?.priceCents,
                            m.membershipPlan?.currency,
                          )}
                          /{m.membershipPlan?.currency?.toUpperCase()}/mo
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[m.status] || ""}`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m.startedAt
                          ? new Date(m.startedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m.endsAt
                          ? new Date(m.endsAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {canWrite && m.status === "active" && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(m.id, "paused")
                                }
                                className="rounded border border-amber-600 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-600/10"
                              >
                                Pause
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(m.id, "cancelled")
                                }
                                className="rounded border border-red-700 px-2 py-0.5 text-xs text-red-400 hover:bg-red-700/10"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {canWrite && m.status === "paused" && (
                            <button
                              onClick={() => handleUpdateStatus(m.id, "active")}
                              className="rounded border border-emerald-600 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-600/10"
                            >
                              Reactivate
                            </button>
                          )}
                          {canWrite && m.status === "cancelled" && (
                            <button
                              onClick={() => handleUpdateStatus(m.id, "active")}
                              className="rounded border border-emerald-600 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-600/10"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canWrite && showEnrollModal && (
        <EnrollModal
          plans={plans}
          clients={clients}
          onEnroll={handleEnroll}
          onClose={() => setShowEnrollModal(false)}
        />
      )}
    </div>
  );
}
