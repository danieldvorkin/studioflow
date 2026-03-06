import { useParams, Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { STUDIO_PAGE } from "../apollo/queries";
import { PageSpinner } from "../components/Spinner";
import { useAuth } from "../auth/AuthProvider";
import { useStudio } from "../studio/StudioProvider";

export default function StudioPageView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { selectedStudioId } = useStudio();

  const role = (user?.roleName || "").toString().toLowerCase();
  const isClient = role === "client" || user?.role === 3;

  const { data, loading, error } = useQuery(STUDIO_PAGE, {
    variables: {
      id,
      studioId: isClient ? selectedStudioId : undefined,
    },
    fetchPolicy: "cache-and-network",
  });

  const page = data?.studioPage;

  if (loading) return <PageSpinner />;

  if (error || !page) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-semibold text-slate-300">Page not found</p>
        <p className="mt-2 text-sm text-slate-500">
          This page may have been removed or is not yet published.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-slate-100">{page.title}</h1>

      {page.content ? (
        <div
          className="prose prose-invert prose-sm max-w-none text-slate-200
                     [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:mt-6 [&_h2]:mb-2
                     [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-200 [&_h3]:mt-4 [&_h3]:mb-1
                     [&_p]:leading-relaxed [&_p]:text-slate-300
                     [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                     [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                     [&_li]:text-slate-300
                     [&_a]:text-sky-400 [&_a]:underline [&_a]:hover:text-sky-300
                     [&_hr]:border-slate-700 [&_hr]:my-6
                     [&_strong]:text-slate-100"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        <p className="text-slate-500 italic">No content yet.</p>
      )}

      <p className="mt-10 text-xs text-slate-600">
        Last updated {new Date(page.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
