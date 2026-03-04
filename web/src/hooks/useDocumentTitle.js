import { useEffect } from "react";

const APP_NAME = "StudioFlow";

/**
 * Sets the browser tab title.
 *
 * @param {string | null | undefined} title  Page-specific title segment.
 *   When falsy the default "StudioFlow — Pilates Studio Management" is used.
 * @param {string} [separator]  Separator between page title and app name.
 */
export function useDocumentTitle(title, separator = " — ") {
  useEffect(() => {
    const previous = document.title;

    if (title) {
      document.title = `${title}${separator}${APP_NAME}`;
    } else {
      document.title = `${APP_NAME} — Studio management at your fingertips`;
    }

    return () => {
      document.title = previous;
    };
  }, [title, separator]);
}
