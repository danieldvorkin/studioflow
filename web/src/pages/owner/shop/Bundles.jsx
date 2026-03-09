import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import {
  BUNDLE_PRODUCTS,
  CLASS_TEMPLATES,
  CURRENT_USER,
  INSTRUCTORS,
} from "../../../apollo/queries";
import {
  CREATE_BUNDLE_PRODUCT,
  DELETE_BUNDLE_PRODUCT,
  UPDATE_BUNDLE_PRODUCT,
} from "../../../apollo/mutations";
import { useToast } from "../../../components/shared/ToastProvider";
import { useAuth } from "../../../auth/AuthProvider";
import {
  isGodmode as isGodmodeUser,
  isOwner,
  isStaff,
  isModerator,
} from "../../../auth/permissions";
import { useCurrency } from "../../../currency/CurrencyProvider";

function dollarsFromCents(cents) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollarsInput(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export default function BundlesPage() {
  useDocumentTitle("Session Bundles");
  const auth = useAuth();
  const { addToast } = useToast();
  const { formatPrice } = useCurrency();

  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;

  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";
  const canManage = isOwner(user) || isStaff(user) || isModerator(user);
  const canWrite = isOwner(user) || isStaff(user);

  const { data: templatesData } = useQuery(CLASS_TEMPLATES, {
    skip: !canManage,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data: instructorsData } = useQuery(INSTRUCTORS, {
    skip: !canManage,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data, loading, refetch } = useQuery(BUNDLE_PRODUCTS, {
    skip: !canManage,
    fetchPolicy: "network-only",
  });

  const [createBundleProduct] = useMutation(CREATE_BUNDLE_PRODUCT);
  const [updateBundleProduct] = useMutation(UPDATE_BUNDLE_PRODUCT);
  const [deleteBundleProduct] = useMutation(DELETE_BUNDLE_PRODUCT);

  const templates = templatesData?.classTemplates || [];
  const instructors = instructorsData?.instructors || [];
  const bundleProducts = data?.bundleProducts || [];

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    creditsCount: "10",
    priceDollars: "0",
    currency: "cad",
    classTemplateId: "",
    instructorId: "",
    active: true,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    creditsCount: "",
    priceDollars: "",
    currency: "cad",
    classTemplateId: "",
    instructorId: "",
    active: true,
  });

  if (userLoading || (!user && !userLoading)) {
    return <div className="text-sm text-slate-300">Loading account…</div>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  if (isGodmodeUser(user) && !auth.isImpersonating) {
    return <Navigate to="/owner" replace />;
  }

  if (roleName === "client" || user?.role === 2) {
    return <Navigate to="/my-bundles" replace />;
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">
          Owner/staff access only
        </h1>
        <p className="text-sm text-slate-400">
          Only staff and the studio owner can manage bundles.
        </p>
      </div>
    );
  }

  const startEdit = (bp) => {
    setEditingId(bp.id);
    setEditForm({
      title: bp.title || "",
      description: bp.description || "",
      creditsCount: String(bp.creditsCount ?? ""),
      priceDollars: dollarsFromCents(bp.priceCents),
      currency: (bp.currency || "cad").toLowerCase(),
      classTemplateId: bp.classTemplate?.id || "",
      instructorId: bp.instructor?.id || "",
      active: bp.active !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitCreate = async (e) => {
    e.preventDefault();

    if (!createForm.classTemplateId && !createForm.instructorId) {
      addToast({
        message: "Select a class template and/or instructor",
        type: "error",
      });
      return;
    }

    try {
      const res = await createBundleProduct({
        variables: {
          title: createForm.title || "Bundle",
          description: createForm.description || null,
          active: createForm.active === true,
          creditsCount: Number(createForm.creditsCount),
          priceCents: centsFromDollarsInput(createForm.priceDollars) ?? 0,
          currency: createForm.currency || "cad",
          classTemplateId: createForm.classTemplateId || null,
          instructorId: createForm.instructorId || null,
        },
      });

      const payload = res.data?.createBundleProduct;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.bundleProduct)
        throw new Error(errors.join(", ") || "Create failed");

      addToast({ message: "Bundle created", type: "success" });
      setCreateForm((f) => ({
        ...f,
        title: "",
        description: "",
        creditsCount: "10",
        priceDollars: "0",
        classTemplateId: "",
        instructorId: "",
        active: true,
      }));
      refetch();
    } catch (err) {
      addToast({ message: err.message || "Create failed", type: "error" });
    }
  };

  const submitEdit = async () => {
    if (!editingId) return;

    if (!editForm.classTemplateId && !editForm.instructorId) {
      addToast({
        message: "Select a class template and/or instructor",
        type: "error",
      });
      return;
    }

    try {
      const res = await updateBundleProduct({
        variables: {
          id: editingId,
          title: editForm.title || null,
          description: editForm.description || null,
          active: editForm.active === true,
          creditsCount: editForm.creditsCount
            ? Number(editForm.creditsCount)
            : null,
          priceCents: editForm.priceDollars
            ? centsFromDollarsInput(editForm.priceDollars)
            : null,
          currency: editForm.currency || null,
          classTemplateId: editForm.classTemplateId || null,
          instructorId: editForm.instructorId || null,
        },
      });

      const payload = res.data?.updateBundleProduct;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.bundleProduct)
        throw new Error(errors.join(", ") || "Update failed");

      addToast({ message: "Bundle updated", type: "success" });
      setEditingId(null);
      refetch();
    } catch (err) {
      addToast({ message: err.message || "Update failed", type: "error" });
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this bundle?")) return;

    try {
      const res = await deleteBundleProduct({ variables: { id } });
      const payload = res.data?.deleteBundleProduct;
      if (!payload?.success)
        throw new Error((payload?.errors || ["Deactivate failed"]).join(", "));
      addToast({ message: "Bundle deactivated", type: "success" });
      refetch();
    } catch (err) {
      addToast({ message: err.message || "Deactivate failed", type: "error" });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Bundles
        </h1>
        <p className="text-sm text-slate-400">
          Create packages of credits that can be redeemed for classes.
        </p>
        {isGodmode && auth.isImpersonating && auth.impersonator?.email ? (
          <p className="mt-1 text-xs text-slate-500">
            Impersonating as {auth.impersonator.email}
          </p>
        ) : null}
      </header>

      {canWrite && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            Add bundle
          </h2>
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            onSubmit={submitCreate}
          >
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Title
              </label>
              <input
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((v) => ({ ...v, title: e.target.value }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="10-class pack"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Credits
              </label>
              <input
                type="number"
                min="1"
                value={createForm.creditsCount}
                onChange={(e) =>
                  setCreateForm((v) => ({ ...v, creditsCount: e.target.value }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Price
              </label>
              <input
                type="number"
                value={createForm.priceDollars}
                onChange={(e) =>
                  setCreateForm((v) => ({ ...v, priceDollars: e.target.value }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-500">
                Charged when purchasing this bundle.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Currency
              </label>
              <select
                value={createForm.currency}
                onChange={(e) =>
                  setCreateForm((v) => ({ ...v, currency: e.target.value }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="cad">CAD</option>
                <option value="usd">USD</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Class template (optional)
              </label>
              <select
                value={createForm.classTemplateId}
                onChange={(e) =>
                  setCreateForm((v) => ({
                    ...v,
                    classTemplateId: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">—</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Instructor (optional)
              </label>
              <select
                value={createForm.instructorId}
                onChange={(e) =>
                  setCreateForm((v) => ({ ...v, instructorId: e.target.value }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">—</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name || i.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={createForm.active}
                  onChange={(e) =>
                    setCreateForm((v) => ({ ...v, active: e.target.checked }))
                  }
                />
                Active
              </label>

              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400"
              >
                Create
              </button>
            </div>

            <div className="md:col-span-2 text-[11px] text-slate-500">
              Note: A bundle must target at least a class template or an
              instructor.
            </div>
          </form>
        </section>
      )}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            All bundles
          </h2>
          <span className="text-[11px] text-slate-500">
            {bundleProducts.length} total
          </span>
        </div>

        {loading && <p className="text-sm text-slate-400">Loading bundles…</p>}
        {!loading && bundleProducts.length === 0 && (
          <p className="text-sm text-slate-500">No bundles yet.</p>
        )}

        {!loading && bundleProducts.length > 0 && (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Credits</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Instructor</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundleProducts.map((bp) => {
                  const isEditing = editingId === bp.id;
                  return (
                    <tr key={bp.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-50">
                        {isEditing ? (
                          <input
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                title: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          bp.title
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={editForm.creditsCount}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                creditsCount: e.target.value,
                              }))
                            }
                            className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          bp.creditsCount
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.priceDollars}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                priceDollars: e.target.value,
                              }))
                            }
                            className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : typeof bp.priceCents === "number" ? (
                          formatPrice(bp.priceCents, bp.currency || "cad")
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <select
                            value={editForm.currency}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                currency: e.target.value,
                              }))
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="cad">CAD</option>
                            <option value="usd">USD</option>
                          </select>
                        ) : (
                          (bp.currency || "cad").toUpperCase()
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <select
                            value={editForm.classTemplateId}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                classTemplateId: e.target.value,
                              }))
                            }
                            className="max-w-[180px] truncate rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="">—</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          bp.classTemplate?.title || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <select
                            value={editForm.instructorId}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                instructorId: e.target.value,
                              }))
                            }
                            className="max-w-[160px] truncate rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="">—</option>
                            {instructors.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name || i.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          bp.instructor?.name || bp.instructor?.email || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editForm.active}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                active: e.target.checked,
                              }))
                            }
                          />
                        ) : bp.active ? (
                          "Yes"
                        ) : (
                          "No"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canWrite && isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={submitEdit}
                              className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
                            >
                              Save
                            </button>
                          </div>
                        ) : canWrite ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(bp)}
                              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            {bp.active && (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(bp.id)}
                                className="rounded-full border border-rose-600/60 px-3 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-600/10"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
