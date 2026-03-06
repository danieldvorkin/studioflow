import { useRef, useCallback, useEffect, useState } from "react";

const TOOLBAR_ACTIONS = [
  { label: "B", cmd: "bold", title: "Bold" },
  { label: "I", cmd: "italic", title: "Italic" },
  { label: "U", cmd: "underline", title: "Underline" },
  { label: "H2", cmd: "formatBlock", title: "Heading 2", value: "h2" },
  { label: "H3", cmd: "formatBlock", title: "Heading 3", value: "h3" },
  { label: "¶", cmd: "formatBlock", title: "Paragraph", value: "p" },
  { label: "• List", cmd: "insertUnorderedList", title: "Bullet list" },
  { label: "1. List", cmd: "insertOrderedList", title: "Numbered list" },
  { label: "—", cmd: "insertHorizontalRule", title: "Horizontal rule" },
  { label: "🔗", cmd: "createLink", title: "Insert link" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function uploadImageFile(file) {
  const token = localStorage.getItem("pilates_token");
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${res.status})`);
  }

  const { url } = await res.json();
  return url;
}

export default function WysiwygEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isFocused = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Seed the DOM once (or when the parent resets the value while unfocused).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isFocused.current) return;
    if (el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = useCallback(
    (cmd, val) => {
      if (cmd === "createLink") {
        const url = window.prompt("Enter URL:", "https://");
        if (url) document.execCommand(cmd, false, url);
      } else {
        document.execCommand(cmd, false, val || null);
      }
      editorRef.current?.focus();
      onChange(editorRef.current?.innerHTML || "");
    },
    [onChange],
  );

  const onInput = useCallback(() => {
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  // Intercept paste: upload image files instead of embedding base64.
  const onPaste = useCallback(
    async (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter((i) => i.type.startsWith("image/"));
      if (imageItems.length === 0) return; // non-image paste — let the browser handle it

      e.preventDefault();
      setUploadError(null);
      setUploading(true);

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (!file) continue;

          // Show a temporary placeholder so the user knows something is happening.
          const placeholderId = `img-uploading-${Date.now()}`;
          document.execCommand(
            "insertHTML",
            false,
            `<span id="${placeholderId}" style="opacity:0.4;font-size:0.8em">[uploading image…]</span>`,
          );

          const url = await uploadImageFile(file);

          // Replace placeholder with the real image.
          const placeholder = editorRef.current?.querySelector(
            `#${placeholderId}`,
          );
          if (placeholder) {
            placeholder.outerHTML = `<img src="${url}" alt="" style="max-width:100%;height:auto;" />`;
          } else {
            document.execCommand(
              "insertHTML",
              false,
              `<img src="${url}" alt="" style="max-width:100%;height:auto;" />`,
            );
          }
        }
      } catch (err) {
        setUploadError(err.message || "Image upload failed.");
        // Remove any lingering placeholders.
        editorRef.current
          ?.querySelectorAll("[id^='img-uploading-']")
          .forEach((el) => el.remove());
      } finally {
        setUploading(false);
        onChange(editorRef.current?.innerHTML || "");
      }
    },
    [onChange],
  );

  return (
    <div className="rounded-md border border-slate-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-slate-700 bg-slate-800/60 px-2 py-1.5">
        {TOOLBAR_ACTIONS.map(({ label, cmd, title, value: val }) => (
          <button
            key={`${cmd}-${label}`}
            type="button"
            title={title}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(cmd, val);
            }}
            className="rounded px-2 py-0.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            {label}
          </button>
        ))}

        {uploading && (
          <span className="ml-auto self-center text-[11px] text-sky-400 animate-pulse">
            Uploading image…
          </span>
        )}
      </div>

      {uploadError && (
        <div className="border-b border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-300">
          {uploadError}
        </div>
      )}

      {/* Editable area — DOM managed via ref, not dangerouslySetInnerHTML. */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => {
          isFocused.current = true;
        }}
        onBlur={() => {
          isFocused.current = false;
        }}
        onInput={onInput}
        onPaste={onPaste}
        className="min-h-[240px] bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none
                   [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                   [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
                   [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                   [&_a]:text-sky-400 [&_a]:underline
                   [&_hr]:border-slate-600
                   [&_img]:max-w-full [&_img]:rounded"
      />

      <div className="border-t border-slate-800 bg-slate-900/40 px-3 py-1 text-[10px] text-slate-600">
        Paste images directly — they are uploaded to secure storage
        automatically.
      </div>
    </div>
  );
}
