import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import { CLASS_TEMPLATES, INSTRUCTORS } from '../apollo/queries'
import { CREATE_CLASS_TEMPLATE, UPDATE_CLASS_TEMPLATE, DELETE_CLASS_TEMPLATE } from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useLocationContext } from '../location/LocationProvider'
import { useAuth } from '../auth/AuthProvider'
import { isInstructor as isInstructorUser, isOwner, isStaff } from '../auth/permissions'

export default function Templates() {
  const { locationId } = useLocationContext()
  const { user } = useAuth()
  const userIsOwner = isOwner(user)
  const userIsStaff = isStaff(user)
  const userIsInstructor = isInstructorUser(user)

  const { data, loading, error } = useQuery(CLASS_TEMPLATES, {
    variables: { studioLocationId: locationId || null },
  })
  const { data: instructorsData } = useQuery(INSTRUCTORS, {
    skip: !(userIsOwner || userIsStaff),
  })
  const [createTemplate] = useMutation(CREATE_CLASS_TEMPLATE)
  const [updateTemplate] = useMutation(UPDATE_CLASS_TEMPLATE)
  const [deleteTemplate] = useMutation(DELETE_CLASS_TEMPLATE)
  const { addToast } = useToast()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    capacity: '',
    durationMinutes: '',
    priceDollars: '',
    instructorId: '',
    currency: 'cad',
  })
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    capacity: '',
    durationMinutes: '',
    priceDollars: '',
    instructorId: '',
    currency: 'cad',
  })

  if (loading) return <p className="text-sm text-slate-400">Loading classes…</p>
  if (error) return <p className="text-sm text-rose-400">Error loading classes</p>

  const templates = data?.classTemplates || []
  const instructors = instructorsData?.instructors || []

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      title: t.title || '',
      description: t.description || '',
      capacity: t.capacity || '',
      durationMinutes: t.durationMinutes || '',
      priceDollars: t.priceCents != null ? String((t.priceCents / 100).toFixed(2)) : '',
      instructorId: userIsInstructor ? user?.id : (t.instructor?.id || ''),
      currency: t.currency || 'cad',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const submitEdit = async (id) => {
    try {
      const res = await updateTemplate({
        variables: {
          id,
          title: editForm.title,
          description: editForm.description,
          capacity: editForm.capacity ? Number(editForm.capacity) : null,
          durationMinutes: editForm.durationMinutes ? Number(editForm.durationMinutes) : null,
          priceCents: editForm.priceDollars ? Math.round(Number(editForm.priceDollars) * 100) : null,
          instructorId: editForm.instructorId || null,
          currency: editForm.currency || 'cad',
        },
      })
      const payload = res.data?.updateClassTemplate
      const errors = payload?.errors || []
      if (errors.length || !payload?.classTemplate) {
        throw new Error(errors.join(', ') || 'Could not update class')
      }
      addToast({ message: 'Class updated', type: 'success' })
      setEditingId(null)
    } catch (e) {
      addToast({ message: e.message || 'Update failed', type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this class? This cannot be undone.')) return
    try {
      const res = await deleteTemplate({ variables: { id } })
      const payload = res.data?.deleteClassTemplate
      if (!payload?.success) {
        throw new Error((payload?.errors || ['Could not delete class']).join(', '))
      }
      addToast({ message: 'Class deleted', type: 'success' })
    } catch (e) {
      addToast({ message: e.message || 'Delete failed', type: 'error' })
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Classes</h1>
        <p className="text-sm text-slate-400">Classes you can schedule into sessions.</p>
      </header>

      {/* section to add new template */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-sm shadow-black/20">
        <h2 className="text-sm font-semibold text-slate-50">Add new class</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Title</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.title}
              onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Instructor</label>
            {(userIsOwner || userIsStaff) ? (
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                value={newForm.instructorId}
                onChange={(e) => setNewForm((f) => ({ ...f, instructorId: e.target.value }))}
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
                {user?.name || user?.email || 'You'}
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-300">Description</label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              rows={2}
              value={newForm.description}
              onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Capacity</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.capacity}
              onChange={(e) => setNewForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Duration (min)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.durationMinutes}
              onChange={(e) => setNewForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Price</label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.priceDollars}
              onChange={(e) => setNewForm((f) => ({ ...f, priceDollars: e.target.value }))}
            />
            <p className="text-[11px] text-slate-500">Amount charged when booking this class.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Currency</label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={newForm.currency}
              onChange={(e) => setNewForm((f) => ({ ...f, currency: e.target.value }))}
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
                  title: newForm.title || 'New class',
                  description: newForm.description || null,
                  capacity: newForm.capacity ? Number(newForm.capacity) : null,
                  durationMinutes: newForm.durationMinutes ? Number(newForm.durationMinutes) : null,
                  priceCents: newForm.priceDollars ? Math.round(Number(newForm.priceDollars) * 100) : null,
                  instructorId: newForm.instructorId || null,
                  studioLocationId: locationId || null,
                  currency: newForm.currency || 'cad',
                },
              })
              const payload = res.data?.createClassTemplate
              const errors = payload?.errors || []
              if (errors.length || !payload?.classTemplate) {
                throw new Error(errors.join(', ') || 'Could not create class')
              }
              addToast({ message: 'Class created', type: 'success' })
              setNewForm((f) => ({
                title: '',
                description: '',
                capacity: '',
                durationMinutes: '',
                priceDollars: '',
                instructorId: userIsInstructor ? (user?.id || '') : '',
                currency: f.currency || 'cad',
              }))
            } catch (e) {
              addToast({ message: e.message || 'Creation failed', type: 'error' })
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
                  <label className="text-xs font-medium text-slate-300">Title</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Description</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Instructor</label>
                  {(userIsOwner || userIsStaff) ? (
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.instructorId}
                      onChange={(e) => setEditForm((f) => ({ ...f, instructorId: e.target.value }))}
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
                      {user?.name || user?.email || 'You'}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">Capacity</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">Duration (min)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.durationMinutes}
                      onChange={(e) => setEditForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.priceDollars}
                      onChange={(e) => setEditForm((f) => ({ ...f, priceDollars: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-300">Currency</label>
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={editForm.currency}
                      onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
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
                  <h3 className="text-sm font-semibold text-slate-50">{t.title}</h3>
                  {t.description && (
                    <p className="text-xs text-slate-400">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span>Capacity: {t.capacity}</span>
                    <span>• Duration: {t.durationMinutes} min</span>
                    <span>
                      • Price:{' '}
                      {t.priceCents
                        ? `${(t.currency || 'cad').toUpperCase()} ${(t.priceCents / 100).toFixed(2)}`
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>Location: {t.studioLocation?.name || '—'}</span>
                    <span>
                      Instructor: {t.instructor?.name || t.instructor?.email || '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800"
                  >
                    Edit details
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-full border border-rose-600/60 px-3 py-1 text-rose-200 hover:bg-rose-600/10"
                    >
                      Delete
                    </button>
                    <Link
                      to={`/templates/${t.id}/sessions`}
                      className="inline-flex items-center rounded-full border border-sky-500/70 px-3 py-1 font-semibold text-sky-200 hover:bg-sky-500/10"
                    >
                      View sessions
                    </Link>
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
