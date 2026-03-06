import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { STUDIO_LOCATIONS, CURRENT_USER, STUDIOS } from "../apollo/queries";
import {
  CREATE_STUDIO_LOCATION,
  UPDATE_STUDIO_LOCATION,
  DELETE_STUDIO_LOCATION,
} from "../apollo/mutations";
import { useState } from "react";
import { useToast } from "../components/ToastProvider";

export default function LocationsPage() {
  useDocumentTitle("Locations");
  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;
  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";
  const isOwner = roleName === "owner" || user?.role === 0;
  const isModerator = roleName === "moderator" || user?.role === 4;

  const [selectedStudioId, setSelectedStudioId] = useState("");

  const isPlatformStaff = isGodmode || isModerator;
  const { data: studiosData } = useQuery(STUDIOS, { skip: !isPlatformStaff });
  const studios = studiosData?.studios || [];

  const effectiveStudioId = isPlatformStaff ? selectedStudioId || null : null;

  const { data, loading, refetch } = useQuery(STUDIO_LOCATIONS, {
    skip: !user,
    variables: effectiveStudioId ? { studioId: effectiveStudioId } : {},
    fetchPolicy: "network-only",
  });

  const [createLocation] = useMutation(CREATE_STUDIO_LOCATION);
  const [updateLocation] = useMutation(UPDATE_STUDIO_LOCATION);
  const [deleteLocation] = useMutation(DELETE_STUDIO_LOCATION);
  const { addToast } = useToast();

  const [createForm, setCreateForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

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
          Only the studio owner or moderators can manage locations.
        </p>
      </div>
    );
  }

  const locations = data?.studioLocations || [];

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name || "",
      address: loc.address || "",
      city: loc.city || "",
      state: loc.state || "",
      zip: loc.zip || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await createLocation({
        variables: {
          name: createForm.name,
          address: createForm.address || null,
          city: createForm.city || null,
          state: createForm.state || null,
          zip: createForm.zip || null,
          studioId: effectiveStudioId || undefined,
        },
      });
      const payload = res.data?.createStudioLocation;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.studioLocation)
        throw new Error(errors.join(", ") || "Create failed");
      addToast({ message: "Location created", type: "success" });
      setCreateForm({ name: "", address: "", city: "", state: "", zip: "" });
      refetch();
    } catch (err) {
      addToast({ message: err.message || "Create failed", type: "error" });
    }
  };

  const submitEdit = async () => {
    try {
      const res = await updateLocation({
        variables: {
          id: editingId,
          name: editForm.name,
          address: editForm.address || null,
          city: editForm.city || null,
          state: editForm.state || null,
          zip: editForm.zip || null,
        },
      });
      const payload = res.data?.updateStudioLocation;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.studioLocation)
        throw new Error(errors.join(", ") || "Update failed");
      addToast({ message: "Location updated", type: "success" });
      setEditingId(null);
      refetch();
    } catch (err) {
      addToast({ message: err.message || "Update failed", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this location? This cannot be undone.")) return;
    try {
      const res = await deleteLocation({ variables: { id } });
      const payload = res.data?.deleteStudioLocation;
      if (!payload?.success)
        throw new Error((payload?.errors || ["Delete failed"]).join(", "));
      addToast({ message: "Location deleted", type: "success" });
      refetch();
    } catch (err) {
      addToast({ message: err.message || "Delete failed", type: "error" });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Locations
        </h1>
        <p className="text-sm text-slate-400">
          Create, rename, and maintain studio locations.
        </p>
      </header>

      {isPlatformStaff && studios.length > 0 && (
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
          Add location
        </h2>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={submitCreate}
        >
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              Name
            </label>
            <input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((v) => ({ ...v, name: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="Downtown"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              Address
            </label>
            <input
              value={createForm.address}
              onChange={(e) =>
                setCreateForm((v) => ({ ...v, address: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="123 Main St"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              City
            </label>
            <input
              value={createForm.city}
              onChange={(e) =>
                setCreateForm((v) => ({ ...v, city: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="Toronto"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              State / Province
            </label>
            <input
              value={createForm.state}
              onChange={(e) =>
                setCreateForm((v) => ({ ...v, state: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="ON"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              ZIP / Postal
            </label>
            <input
              value={createForm.zip}
              onChange={(e) =>
                setCreateForm((v) => ({ ...v, zip: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="M5V 2T6"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400"
            >
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            All locations
          </h2>
          <span className="text-[11px] text-slate-500">
            {locations.length} total
          </span>
        </div>

        {loading && (
          <p className="text-sm text-slate-400">Loading locations…</p>
        )}
        {!loading && locations.length === 0 && (
          <p className="text-sm text-slate-500">No locations yet.</p>
        )}

        {!loading && locations.length > 0 && (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">ZIP</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const isEditing = editingId === loc.id;
                  return (
                    <tr key={loc.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-50">
                        {isEditing ? (
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                name: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          loc.name
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <input
                            value={editForm.address}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                address: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          loc.address || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <input
                            value={editForm.city}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                city: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          loc.city || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <input
                            value={editForm.state}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                state: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          loc.state || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {isEditing ? (
                          <input
                            value={editForm.zip}
                            onChange={(e) =>
                              setEditForm((v) => ({
                                ...v,
                                zip: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          />
                        ) : (
                          loc.zip || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={submitEdit}
                              className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(loc)}
                              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(loc.id)}
                              className="rounded-full border border-rose-600/60 px-3 py-1 text-[11px] text-rose-200 hover:bg-rose-600/10"
                            >
                              Delete
                            </button>
                          </div>
                        )}
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
