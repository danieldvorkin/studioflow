import { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(input: { email: $email }) {
      success
      errors
    }
  }
`;

export default function ForgotPassword() {
  useDocumentTitle("Forgot Password");
  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const { register, handleSubmit } = useForm();

  const onSubmit = async ({ email }) => {
    setError(null);
    try {
      const res = await forgotPassword({ variables: { email } });
      const payload = res?.data?.forgotPassword;
      if (payload?.success) {
        setSent(true);
      } else {
        setError((payload?.errors || []).join(", ") || "Something went wrong.");
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen md:grid-cols-2">
        <AuthMarketingPanel />

        <div className="flex items-center justify-center px-4 py-10 md:border-l md:border-slate-800">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/25">
            <div className="mb-6 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                StudioFlow
              </div>
              <h2 className="text-xl font-semibold text-slate-50">
                Forgot your password?
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {sent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                  <svg
                    className="h-6 w-6 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-300">
                  If an account with that email exists, a reset link is on its
                  way. Check your inbox.
                </p>
                <Link
                  to="/signin"
                  className="inline-block text-xs text-sky-400 hover:text-sky-300"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 text-sm"
              >
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Email address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                <div className="text-center text-xs text-slate-400">
                  Remembered it?{" "}
                  <Link
                    to="/signin"
                    className="text-slate-200 hover:text-white"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthMarketingPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-slate-950 md:flex md:min-h-screen md:items-stretch">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <div className="relative flex w-full flex-col justify-between p-10">
        <div>
          <div className="text-xs font-semibold tracking-[0.3em] uppercase text-sky-400/80">
            Studio<strong className="text-slate-300">Flow</strong>
          </div>
          <h1 className="mt-6 max-w-md text-3xl font-semibold tracking-tight text-slate-50">
            We've got you covered.
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">
            Reset your password and get back to managing your studio in minutes.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Secure sign-in • Google OAuth supported • Encrypted tokens
        </div>
      </div>
    </div>
  );
}
