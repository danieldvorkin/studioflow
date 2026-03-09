import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page Not Found");
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
        404
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-slate-50">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Looking for something? The page you're looking for doesn't exist.
      </p>
      {!loading && (
        <Link
          to={user ? "/dashboard" : "/"}
          className="mt-6 inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-on-accent hover:bg-sky-400"
        >
          {user ? "Back to dashboard" : "Back to home"}
        </Link>
      )}
    </div>
  );
}
