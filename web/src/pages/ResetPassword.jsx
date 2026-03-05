import { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAuth } from "../auth/AuthProvider";

const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(input: { token: $token, password: $password }) {
      success
      token
      user {
        id
        studioId
        email
        name
        role
        roleName
        godmode
        active
        availableForSessions
      }
      errors
    }
  }
`;

export default function ResetPassword() {
  useDocumentTitle("Reset Password");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD);
  const [error, setError] = useState(null);
  const auth = useAuth();
  const { register, handleSubmit } = useForm();

  const onSubmit = async ({ password: pw, confirm }) => {
    if (pw !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    try {
      const res = await resetPassword({ variables: { token, password: pw } });
      const payload = res?.data?.resetPassword;
      if (payload?.success && payload?.token) {
        await auth.signInWithToken(payload.token, payload.user || null);
        navigate("/dashboard");
      } else {
        setError(
          (payload?.errors || []).join(", ") ||
            "Reset failed. The link may have expired.",
        );
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          <p className="text-sm text-rose-400">
            Invalid or missing reset token.
          </p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-xs text-sky-400 hover:text-sky-300"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

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
                Choose a new password
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Pick something strong that you haven't used before.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 text-sm"
            >
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  New password
                </label>
                <input
                  {...register("password")}
                  type="password"
                  required
                  minLength={8}
                  autoFocus
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Confirm new password
                </label>
                <input
                  {...register("confirm")}
                  type="password"
                  required
                  minLength={8}
                  placeholder="Repeat your password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Saving…" : "Update password"}
              </button>

              <div className="text-center text-xs text-slate-400">
                Remember your password?{" "}
                <Link to="/signin" className="text-slate-200 hover:text-white">
                  Sign in
                </Link>
              </div>
            </form>
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
            Almost back in.
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">
            Set your new password and you'll be back to managing your studio in
            seconds.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Secure sign-in • Google OAuth supported • Encrypted tokens
        </div>
      </div>
    </div>
  );
}
