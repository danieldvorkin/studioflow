import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CURRENT_USER, CLIENTS } from "../apollo/queries";
import {
  UPDATE_CLIENT,
  DELETE_CLIENT,
  START_IMPERSONATION,
} from "../apollo/mutations";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../auth/AuthProvider";
import InviteClientModal from "../components/InviteClientModal";

export default function ClientsPage() {
  useDocumentTitle("Clients");
  const { data: userData } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;
  const role = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || role === "godmode";
  const isOwner = isGodmode || role === "owner" || user?.role === 0;
  const isStaff = isGodmode || role === "staff" || user?.role === 1;
  const isModerator = isGodmode || role === "moderator" || user?.role === 4;
  const canViewClients = isOwner || isStaff || isModerator;

  const { data, loading, error } = useQuery(CLIENTS, {
    skip: !user,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const [updateClient] = useMutation(UPDATE_CLIENT);
  const [deleteClient] = useMutation(DELETE_CLIENT);
  const [startImpersonation] = useMutation(START_IMPERSONATION);
  const { addToast } = useToast();
  const auth = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [showInviteModal, setShowInviteModal] = useState(false);

  if (!user) {
    return <p className="text-sm text-slate-400">Sign in to view clients.</p>;
  }

  if (!canViewClients) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">Restricted</h1>
        <p className="text-sm text-slate-400">
          Only owners, staff, and moderators can view the client list.
        </p>
      </div>
    );
  }

  const clients = data?.clients || [];

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitEdit = async (id) => {
    try {
      const res = await updateClient({ variables: { id, ...editForm } });
      const payload = res.data?.updateClient;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.client)
        throw new Error(errors.join(", ") || "Could not update client");
      addToast({ message: "Client updated", type: "success" });
      setEditingId(null);
    } catch (e) {
      addToast({ message: e.message || "Update failed", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this client? This will also remove their bookings.",
      )
    )
      return;
    try {
      const res = await deleteClient({ variables: { id } });
      const payload = res.data?.deleteClient;
      if (!payload?.success)
        throw new Error((payload?.errors || ["Delete failed"]).join(", "));
      addToast({ message: "Client deleted", type: "success" });
    } catch (e) {
      addToast({ message: e.message || "Delete failed", type: "error" });
    }
  };

  const handleViewAsClient = async (client) => {
    if (!client?.user?.id) {
      addToast({
        message: "This client does not have a login user.",
        type: "error",
      });
      return;
    }
    if (client.user.id === user?.id) return;

    try {
      const res = await startImpersonation({
        variables: { userId: client.user.id },
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
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Clients
          </h1>
          <p className="text-sm text-slate-400">
            View the people who attend your classes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M7 2v10M2 7h10" strokeLinecap="round" />
          </svg>
          Invite client
        </button>
      </header>
      {showInviteModal && (
        <InviteClientModal onClose={() => setShowInviteModal(false)} />
      )}

      {loading && <p className="text-sm text-slate-400">Loading clients…</p>}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-700/40 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error.message || "Could not load clients."}
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
          No clients yet.
        </p>
      )}

      {!loading && clients.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/50">
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  {(isOwner || isModerator) && (
                    <th className="px-3 py-2 text-right">View as</th>
                  )}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">
                      {editingId === c.id ? (
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      ) : (
                        <Link
                          to={`/clients/${c.id}`}
                          className="font-medium text-slate-100 hover:text-sky-300"
                        >
                          {c.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {editingId === c.id ? (
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        c.email
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {editingId === c.id ? (
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              phone: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        c.phone || "—"
                      )}
                    </td>
                    {(isOwner || isModerator) && (
                      <td className="px-3 py-2 text-right text-xs">
                        {c.user?.id && c.user.id !== user?.id ? (
                          <button
                            type="button"
                            onClick={() => handleViewAsClient(c)}
                            className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-400 hover:text-sky-300"
                          >
                            View as
                          </button>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right text-xs">
                      {canViewClients &&
                        (editingId === c.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => submitEdit(c.id)}
                              className="rounded-full bg-sky-500 px-3 py-1 font-semibold text-on-accent hover:bg-sky-400"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            {(isOwner || isModerator) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(c.id)}
                                className="rounded-full border border-rose-600/60 px-3 py-1 text-rose-200 hover:bg-rose-600/10"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
