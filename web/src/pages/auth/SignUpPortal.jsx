import { useMutation, useQuery, gql } from "@apollo/client";
import { useForm, useWatch } from "react-hook-form";
import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import client from "../../apollo/client";
import { useAuth } from "../../auth/AuthProvider";
import DevSeedLoginButtons from "../../auth/DevSeedLoginButtons";

const fakerModulePromise = import.meta.env.DEV
  ? import("@faker-js/faker")
  : null;

const SIGN_UP = gql`
  mutation SignUp(
    $email: String!
    $password: String!
    $name: String
    $accountType: AccountTypeEnum!
    $studioInviteCode: String
    $invitationToken: String
  ) {
    signUp(
      input: {
        email: $email
        password: $password
        name: $name
        accountType: $accountType
        studioInviteCode: $studioInviteCode
        invitationToken: $invitationToken
      }
    ) {
      user {
        id
        email
        name
        role
        roleName
        active
        availableForSessions
      }
      errors
    }
  }
`;

const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        name
        role
        roleName
        active
        availableForSessions
      }
      errors
    }
  }
`;

const CLIENT_INVITATION_BY_TOKEN = gql`
  query ClientInvitationByToken($token: String!) {
    clientInvitationByToken(token: $token) {
      id
      email
      name
      status
      invitedByName
    }
  }
`;

export default function SignUpPortal({ accountType }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken =
    accountType === "CLIENT" ? searchParams.get("token") || null : null;
  // Studio code pre-filled from public class page share links (?code=)
  const prefilledStudioCode =
    accountType === "CLIENT" ? searchParams.get("code") || null : null;
  // Post-signup redirect (e.g. back to booking page)
  const postSignupRedirect = searchParams.get("redirect") || null;

  const { register, handleSubmit, control, setValue } = useForm();
  const [error, setError] = useState(null);

  // Look up the invitation so we can show a friendly banner
  const { data: invitationData } = useQuery(CLIENT_INVITATION_BY_TOKEN, {
    variables: { token: invitationToken || "" },
    skip: !invitationToken,
    fetchPolicy: "network-only",
  });
  const invitation = invitationData?.clientInvitationByToken;

  // Pre-fill email + name from invitation
  useEffect(() => {
    if (!invitation) return;
    if (invitation.email)
      setValue("email", invitation.email, { shouldDirty: true });
    if (invitation.name)
      setValue("name", invitation.name, { shouldDirty: true });
  }, [invitation, setValue]);

  const [signUp, { loading: signingUp }] = useMutation(SIGN_UP);
  const [signIn, { loading: signingIn }] = useMutation(SIGN_IN);

  const title =
    accountType === "OWNER" ? "Create owner account" : "Create client account";
  const subtitle =
    accountType === "OWNER"
      ? "Set up your studio workspace in seconds."
      : "Book classes, manage bookings, and save a card.";

  const showStudioJoin = accountType === "OWNER";

  const nameRequired = accountType === "CLIENT";
  const busy = signingUp || signingIn;

  const password = useWatch({ control, name: "password" });
  const passwordConfirmation = useWatch({
    control,
    name: "passwordConfirmation",
  });
  const passwordMismatch = !!(
    passwordConfirmation && password !== passwordConfirmation
  );

  if (auth.user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setError(null);
    try {
      if (data.password !== data.passwordConfirmation) {
        setError("Password confirmation does not match");
        return;
      }

      const res = await signUp({
        variables: {
          email: data.email,
          password: data.password,
          name: data.name || null,
          accountType,
          studioInviteCode: showStudioJoin
            ? data.studioInviteCode || null
            : prefilledStudioCode || null,
          invitationToken: invitationToken || null,
        },
      });

      const payload = res?.data?.signUp;
      if (!payload?.user) {
        setError((payload?.errors || []).join(", ") || "Sign up failed");
        return;
      }

      // Auto sign-in right after creating the account.
      const signInRes = await signIn({
        variables: { email: data.email, password: data.password },
      });
      const signInPayload = signInRes?.data?.signIn;

      if (!signInPayload?.token) {
        navigate("/signin");
        return;
      }

      try {
        if (signInPayload.user)
          localStorage.setItem(
            "pilates_user",
            JSON.stringify(signInPayload.user),
          );
      } catch {
        // ignore
      }

      await auth.signInWithToken(
        signInPayload.token,
        signInPayload.user || null,
      );
      try {
        await client.resetStore();
      } catch {
        /* ignore */
      }
      navigate(postSignupRedirect || "/dashboard");
    } catch (e) {
      setError(e.message || "Sign up failed");
    }
  };

  const onPickDevSeed = (account) => {
    if (!account) return;
    navigate("/signin", { state: { devSeed: account } });
  };

  const fillRandomTestData = async ({ submitAfter = false } = {}) => {
    if (!import.meta.env.DEV) return;
    setError(null);
    try {
      const mod = await fakerModulePromise;
      const faker = mod?.faker;
      if (!faker) throw new Error("Faker not available");

      const fullName = faker.person.fullName();
      const email = faker.internet.email().toLowerCase();
      const nextPassword = faker.internet.password({ length: 14 });

      setValue("name", fullName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue("email", email, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      if (showStudioJoin)
        setValue("studioInviteCode", "", {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      setValue("password", nextPassword, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue("passwordConfirmation", nextPassword, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      if (submitAfter) {
        // Ensure form state is applied before submitting.
        setTimeout(() => handleSubmit(onSubmit)(), 0);
      }
    } catch (e) {
      setError(e?.message || "Failed to generate test data");
    }
  };

  const handleFillRandom = () => fillRandomTestData();
  const handleFillRandomAndSubmit = () =>
    fillRandomTestData({ submitAfter: true });

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen md:grid-cols-2">
        <AuthMarketingPanel accountType={accountType} />

        <div className="flex items-center justify-center px-4 py-10 md:border-l md:border-slate-800">
          <div
            className={
              import.meta.env.DEV ? "w-full max-w-4xl" : "w-full max-w-md"
            }
          >
            <div
              className={
                import.meta.env.DEV ? "grid gap-4 md:grid-cols-[1fr_340px]" : ""
              }
            >
              <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/25">
                <div className="mb-6 text-center">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                    StudioFlow
                  </div>
                  <h2 className="text-xl font-semibold text-slate-50">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
                </div>

                {invitation && invitation.status === "pending" && (
                  <div className="mb-5 rounded-xl border border-sky-700/50 bg-sky-900/20 px-4 py-3 text-sm">
                    <div className="font-semibold text-sky-300 mb-0.5">
                      You&apos;ve been invited! 🎉
                    </div>
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-200">
                        {invitation.invitedByName}
                      </span>{" "}
                      has invited you to join their studio. Your email has been
                      pre-filled — just set a password to get started.
                    </p>
                  </div>
                )}

                {invitationToken &&
                  invitation &&
                  invitation.status === "accepted" && (
                    <div className="mb-5 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
                      This invitation has already been used. You can still
                      create an account below.
                    </div>
                  )}

                {invitationToken &&
                  invitation &&
                  invitation.status === "expired" && (
                    <div className="mb-5 rounded-xl border border-rose-700/40 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
                      This invitation has expired. Ask your studio to send a new
                      one.
                    </div>
                  )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4 text-sm"
                >
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Name
                    </label>
                    <input
                      {...register("name")}
                      required={nameRequired}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    {nameRequired && (
                      <p className="text-[11px] text-slate-500">
                        Used for bookings and receipts.
                      </p>
                    )}
                    {showStudioJoin && (
                      <p className="text-[11px] text-slate-500">
                        Creates a new studio workspace unless you enter a studio
                        code.
                      </p>
                    )}
                  </div>

                  {showStudioJoin && (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Studio code (optional)
                      </label>
                      <input
                        {...register("studioInviteCode")}
                        autoCapitalize="characters"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="e.g. S1a2b3c4d5e6f"
                      />
                      <p className="text-[11px] text-slate-500">
                        Have an existing studio? Ask the owner for the studio
                        code.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Email
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      required
                      readOnly={
                        !!(invitation && invitation.status === "pending")
                      }
                      className={`w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${invitation && invitation.status === "pending" ? "opacity-70 cursor-default" : ""}`}
                    />
                    {invitation && invitation.status === "pending" && (
                      <p className="text-[11px] text-slate-500">
                        Email pre-filled from your invitation.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <input
                      {...register("password")}
                      type="password"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Confirm password
                    </label>
                    <input
                      {...register("passwordConfirmation")}
                      type="password"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    {passwordMismatch && (
                      <p className="text-xs text-rose-400">
                        Password confirmation does not match
                      </p>
                    )}
                  </div>

                  {error && <p className="text-xs text-rose-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={busy || passwordMismatch}
                    className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? "Creating account…" : "Create account"}
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <Link to="/signup" className="hover:text-slate-200">
                      Back
                    </Link>
                    <Link to="/signin" className="hover:text-slate-200">
                      Already have an account? Sign in
                    </Link>
                  </div>
                </form>
              </div>

              {import.meta.env.DEV && (
                <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Dev
                        </div>
                        <div className="text-xs font-medium text-slate-200">
                          Generate test signup data
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFillRandom}
                          disabled={busy}
                          className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Fill random
                        </button>
                        <button
                          type="button"
                          onClick={handleFillRandomAndSubmit}
                          disabled={busy}
                          className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Fill + submit
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Fills name, email, password, and confirmation.
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                    <DevSeedLoginButtons
                      variant="bare"
                      busy={busy}
                      onPick={onPickDevSeed}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthMarketingPanel({ accountType }) {
  const eyebrow = accountType === "OWNER" ? "Owner portal" : "Client portal";
  const heading =
    accountType === "OWNER"
      ? "Open your studio workspace."
      : "Book sessions with ease.";
  const copy =
    accountType === "OWNER"
      ? "Manage schedules, bookings, staff, and payouts — and get paid with Stripe."
      : "Reserve sessions, manage bookings, and keep payment details on file.";

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
          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            {eyebrow}
          </div>
          <h1 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-slate-50">
            {heading}
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">{copy}</p>
        </div>

        <div className="pointer-events-none relative mt-10 flex flex-1 items-center justify-center">
          <svg
            viewBox="0 0 900 700"
            className="h-full w-full max-w-2xl"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sf" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <g className="text-sky-400">
              <path
                d="M120 540c120-140 250-210 390-220 170-12 300 80 370 240"
                fill="none"
                stroke="url(#sf)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M170 230c110 20 190 10 260-34 86-56 160-118 296-98 94 14 162 84 198 166"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle
                cx="300"
                cy="260"
                r="84"
                fill="currentColor"
                opacity="0.06"
              />
              <circle
                cx="610"
                cy="390"
                r="124"
                fill="currentColor"
                opacity="0.05"
              />
              <circle
                cx="740"
                cy="190"
                r="66"
                fill="currentColor"
                opacity="0.06"
              />
              <path
                d="M260 470h380"
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M320 530h260"
                stroke="currentColor"
                strokeOpacity="0.10"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        <div className="text-xs text-slate-500">
          No credit card required • Cancel anytime • Secure by design
        </div>
      </div>
    </div>
  );
}
