import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { CURRENT_USER, CLIENTS } from '../apollo/queries'
import { UPDATE_CLIENT, DELETE_CLIENT, TOGGLE_CLIENT_BLOCK, START_IMPERSONATION } from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useAuth } from '../auth/AuthProvider'

export default function ClientsPage() {
  const { data: userData } = useQuery(CURRENT_USER)
  const user = userData?.currentUser
  const role = (user?.roleName || '').toString().toLowerCase()
  const isGodmode = user?.godmode === true || role === 'godmode'
  const isOwner = isGodmode || role === 'owner' || user?.role === 0
  const isInstructor = isGodmode || role === 'instructor'

  const { data, loading } = useQuery(CLIENTS, {
    skip: !user,
  })

  const [updateClient] = useMutation(UPDATE_CLIENT)
  const [toggleBlock] = useMutation(TOGGLE_CLIENT_BLOCK)
  const [deleteClient] = useMutation(DELETE_CLIENT)
  const [startImpersonation] = useMutation(START_IMPERSONATION)
  const { addToast } = useToast()
  const auth = useAuth()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' })

  if (!user) {
    return <p className="text-sm text-slate-400">Sign in to view clients.</p>
  }

  if (!isOwner && !isInstructor) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">Restricted</h1>
        <p className="text-sm text-slate-400">
          Only owners and instructors can view the client list.
        </p>
      </div>
    )
  }

  const clients = data?.clients || []

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditForm({ name: c.name || '', email: c.email || '', phone: c.phone || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const submitEdit = async (id) => {
    try {
      const res = await updateClient({ variables: { id, ...editForm } })
      const payload = res.data?.updateClient
      const errors = payload?.errors || []
      if (errors.length || !payload?.client) throw new Error(errors.join(', ') || 'Could not update client')
      addToast({ message: 'Client updated', type: 'success' })
      setEditingId(null)
    } catch (e) {
      addToast({ message: e.message || 'Update failed', type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client? This will also remove their bookings.')) return
    try {
      const res = await deleteClient({ variables: { id } })
      const payload = res.data?.deleteClient
      if (!payload?.success) throw new Error((payload?.errors || ['Delete failed']).join(', '))
      addToast({ message: 'Client deleted', type: 'success' })
    } catch (e) {
      addToast({ message: e.message || 'Delete failed', type: 'error' })
    }
  }

  const handleViewAsClient = async (client) => {
    if (!client?.user?.id) {
      addToast({ message: 'This client does not have a login user.', type: 'error' })
      return
    }
    if (client.user.id === user?.id) return

    try {
      const res = await startImpersonation({ variables: { userId: client.user.id } })
      const payload = res.data?.startImpersonation
      const errors = payload?.errors || []
      if (!payload?.token || errors.length) {
        addToast({ message: errors.join(', ') || 'Could not start view-as session', type: 'error' })
        return
      }

      await auth.beginImpersonation(payload.token, payload.user)
      addToast({
        message: `Now viewing as ${payload.user?.name || payload.user?.email || 'selected user'}`,
        type: 'success',
      })
    } catch (e) {
      addToast({ message: e.message || 'Could not start view-as session', type: 'error' })
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Clients</h1>
        <p className="text-sm text-slate-400">
          View the people who attend your classes.
        </p>
      </header>

      {loading && <p className="text-sm text-slate-400">Loading clients…</p>}

      {!loading && clients.length === 0 && (
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
                  {isInstructor && <th className="px-3 py-2">Blocked</th>}
                  {isOwner && <th className="px-3 py-2 text-right">View as</th>}
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
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {editingId === c.id ? (
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
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
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      ) : (
                        c.phone || '—'
                      )}
                    </td>
                    {isInstructor && (
                      <td className="px-3 py-2 text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await toggleBlock({
                                variables: { clientId: c.id, blocked: !c.blockedByCurrentInstructor },
                              })
                              const errors = res.data?.toggleClientBlock?.errors || []
                              if (errors.length) throw new Error(errors.join(', '))
                              addToast({ message: c.blockedByCurrentInstructor ? 'Client unblocked' : 'Client blocked', type: 'success' })
                            } catch (e) {
                              addToast({ message: e.message || 'Update failed', type: 'error' })
                            }
                          }}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c.blockedByCurrentInstructor ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800 text-slate-400'}`}
                        >
                          {c.blockedByCurrentInstructor ? 'Blocked' : 'Allow'}
                        </button>
                      </td>
                    )}
                    {isOwner && (
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
                      {(isOwner || isInstructor) && (
                        editingId === c.id ? (
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
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleDelete(c.id)}
                                className="rounded-full border border-rose-600/60 px-3 py-1 text-rose-200 hover:bg-rose-600/10"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
