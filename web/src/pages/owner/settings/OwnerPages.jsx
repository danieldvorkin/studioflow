import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  STUDIO_PAGES,
  CREATE_STUDIO_PAGE,
  UPDATE_STUDIO_PAGE,
  DELETE_STUDIO_PAGE,
} from "../../../apollo/queries";
import WysiwygEditor from "../../../components/shared/WysiwygEditor";

const EMPTY_FORM = { title: "", content: "", published: false, position: 0 };

export default function OwnerPages() {
  const { data, loading, refetch } = useQuery(STUDIO_PAGES, {
    fetchPolicy: "network-only",
  });

  const [createPage] = useMutation(CREATE_STUDIO_PAGE);
  const [updatePage] = useMutation(UPDATE_STUDIO_PAGE);
  const [deletePage] = useMutation(DELETE_STUDIO_PAGE);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, page = existing
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const pages = data?.studioPages || [];

  function openNew() {
    setForm(EMPTY_FORM);
    setErrors([]);
    setEditing({});
  }

  function openEdit(page) {
    setForm({
      title: page.title,
      content: page.content || "",
      published: page.published,
      position: page.position,
    });
    setErrors([]);
    setEditing(page);
  }

  function closeEditor() {
    setEditing(null);
    setErrors([]);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors(["Title is required"]);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      if (editing?.id) {
        const { data: res } = await updatePage({
          variables: {
            id: editing.id,
            ...form,
            position: Number(form.position),
          },
        });
        const errs = res?.updateStudioPage?.errors || [];
        if (errs.length) {
          setErrors(errs);
          return;
        }
      } else {
        const { data: res } = await createPage({
          variables: { ...form, position: Number(form.position) },
        });
        const errs = res?.createStudioPage?.errors || [];
        if (errs.length) {
          setErrors(errs);
          return;
        }
      }
      await refetch();
      closeEditor();
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await deletePage({ variables: { id } });
      await refetch();
      setConfirmDelete(null);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Studio Pages</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create custom pages (e.g. Nutrition Guide, Studio Rules) visible to
            all studio members.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
        >
          + New Page
        </button>
      </div>

      {/* Page list */}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 py-16 text-center">
          <p className="text-slate-400">No custom pages yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Click "New Page" to create your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">
                    {page.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      page.published
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {page.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  /{page.slug} · position {page.position}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 ml-4">
                <button
                  type="button"
                  onClick={() => openEdit(page)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500 hover:text-sky-400 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(page)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-500 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-10 px-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl mb-10">
            <h2 className="mb-5 text-lg font-bold text-slate-100">
              {editing?.id ? "Edit Page" : "New Page"}
            </h2>

            {errors.length > 0 && (
              <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300 space-y-1">
                {errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Nutrition Guide"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Position */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Position (sort order)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.position}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        position: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    id="published-toggle"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, published: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500"
                  />
                  <label
                    htmlFor="published-toggle"
                    className="text-sm text-slate-300 select-none"
                  >
                    Published (visible to members)
                  </label>
                </div>
              </div>

              {/* WYSIWYG editor */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Content
                </label>
                <WysiwygEditor
                  value={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : editing?.id
                      ? "Save Changes"
                      : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-700 bg-slate-950 p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-bold text-slate-100">
              Delete page?
            </h2>
            <p className="mb-6 text-sm text-slate-400">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-200">{confirmDelete.title}</strong>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-60"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
