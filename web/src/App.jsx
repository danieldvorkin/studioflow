import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Outlet,
  Navigate,
  NavLink,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "@apollo/client";
import "./App.css";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SignUpPortal from "./pages/SignUpPortal";
import Landing from "./pages/Landing";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGate from "./auth/RoleGate";
import { useAuth } from "./auth/AuthProvider";
import Templates from "./pages/Templates";
import Sessions from "./pages/Sessions";
import Booking from "./pages/Booking";
import Schedule from "./pages/Schedule";
import Owner from "./pages/Owner";
import LocationsPage from "./pages/Locations";
import BookingsPage from "./pages/Bookings";
import BookingShow from "./pages/BookingShow";
import ClientsPage from "./pages/Clients";
import InstructorPayoutsPage from "./pages/InstructorPayouts";
import Favorites from "./pages/Favorites";
import ClassDetail from "./pages/ClassDetail";
import PublicClassDetail from "./pages/PublicClassDetail";
import { PageSpinner } from "./components/Spinner";

const Dashboard = lazy(() => import("./pages/dashboard"));
const Profile = lazy(() => import("./pages/profile"));
import { useTheme } from "./theme/ThemeProvider";
import { useLocationContext } from "./location/LocationProvider";
import { STUDIO_SETTINGS } from "./apollo/queries";
import { useStudio } from "./studio/StudioProvider";

function NavItem({
  to,
  onNavigate,
  children,
  variant = "sidebar",
  end = true,
}) {
  const base =
    variant === "mobile"
      ? "rounded-lg px-3 py-2 text-sm transition"
      : "rounded-lg px-3 py-2 transition";

  const inactive =
    variant === "mobile"
      ? "text-slate-200 hover:bg-slate-800/80 hover:text-white"
      : "text-slate-300 hover:bg-slate-800/80 hover:text-white";

  const active =
    variant === "mobile"
      ? "bg-slate-800/80 text-white font-semibold"
      : "bg-slate-800/80 text-white font-semibold";

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
      onClick={onNavigate}
    >
      {children}
    </NavLink>
  );
}

function NavFolder({
  label,
  children,
  defaultOpen = true,
  variant = "sidebar",
}) {
  const summaryClass =
    variant === "mobile"
      ? "flex cursor-pointer select-none items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 hover:bg-slate-800/60"
      : "flex cursor-pointer select-none items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 hover:bg-slate-800/60";

  return (
    <details open={defaultOpen} className="group">
      <summary className={summaryClass}>
        <span>{label}</span>
        <span className="text-slate-500 transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-1 flex flex-col gap-1 border-l border-slate-800 pl-2">
        {children}
      </div>
    </details>
  );
}

function AppShell() {
  const { user, signOut, isImpersonating, stopImpersonation, impersonator } =
    useAuth();
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || (user?.email ? user.email[0].toUpperCase() : "?");

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavOpenRef = useRef(mobileNavOpen);
  const routerLocation = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { locations, locationId, setLocationId } = useLocationContext();

  const role = (user?.roleName || "").toString().toLowerCase();
  const isClient =
    role === "client" || user?.role === 3;
  const { studios, selectedStudioId, setSelectedStudioId } = useStudio();

  const { data: studioSettingsData } = useQuery(STUDIO_SETTINGS, {
    variables: isClient ? { studioId: selectedStudioId } : undefined,
    skip: isClient && !selectedStudioId,
  });
  const dashboardTitle =
    studioSettingsData?.studioSettings?.dashboardTitle ||
    "-- Select a studio --";
  const clientsPageEnabled =
    studioSettingsData?.studioSettings?.clientsPageEnabled !== false;

  const roleRaw = user?.roleName;
  const isOwner =
    roleRaw === "owner" || user?.role === 0 || roleRaw === "OWNER" || roleRaw === "godmode" || user?.godmode === true;
  const isStaff = roleRaw === "staff" || user?.role === 1;
  const isModerator = roleRaw === "moderator" || user?.role === 4 || roleRaw === "godmode" || user?.godmode === true;

  const canManageStudio = isOwner || isStaff || isModerator;

  useEffect(() => {
    mobileNavOpenRef.current = mobileNavOpen;
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpenRef.current) return undefined;
    const t = window.setTimeout(() => setMobileNavOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [routerLocation.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (mobileNavOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden h-dvh min-h-0 overflow-y-auto md:flex md:w-64 flex-col gap-6 border-r border-slate-800 bg-slate-950/80 px-5 py-6">
        <div>
          <div className="text-xs font-semibold tracking-[0.3em] uppercase text-sky-400/80">
            Studio<strong className="text-slate-300">Flow</strong>
          </div>
        </div>
        <nav className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          <NavFolder label="General" defaultOpen>
            <NavItem to="/dashboard">Dashboard</NavItem>
            <NavItem to="/profile">Profile</NavItem>
          </NavFolder>

          <NavFolder label="Operations" defaultOpen>
            <NavItem to="/schedule">Calendar</NavItem>
            <NavItem to="/bookings" end={false}>
              Bookings
            </NavItem>
            {!isClient && <NavItem to="/my-bookings">My bookings</NavItem>}
            {isClient && <NavItem to="/saved">Saved</NavItem>}
            {canManageStudio && clientsPageEnabled && (
              <NavItem to="/clients">Clients</NavItem>
            )}
            {canManageStudio && (
              <NavItem to="/templates" end={false}>
                Classes
              </NavItem>
            )}
          </NavFolder>

          {(isOwner || isModerator) && (
            <NavFolder label="Owner" defaultOpen>
              <NavItem to="/owner">Owner</NavItem>
              <NavItem to="/owner/instructor-payouts">
                Instructor payouts
              </NavItem>
              <NavItem to="/locations">Locations</NavItem>
            </NavFolder>
          )}
        </nav>
        <div className="mt-auto text-xs text-slate-500">
          © {new Date().getFullYear()} StudioFlow
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(85vw,20rem)] flex-col gap-4 border-r border-slate-800 bg-slate-950/95 px-4 py-4 text-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold tracking-[0.3em] uppercase text-sky-400/80">
                Studio<strong className="text-slate-300">Flow</strong>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {isClient && studios.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Studio
                </div>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={selectedStudioId || ""}
                  onChange={(e) => setSelectedStudioId(e.target.value || null)}
                >
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {locations.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Location
                </div>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={locationId || ""}
                  onChange={(e) => setLocationId(e.target.value || null)}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-2">
                <NavFolder label="General" defaultOpen variant="mobile">
                  <NavItem
                    to="/dashboard"
                    variant="mobile"
                    onNavigate={() => setMobileNavOpen(false)}
                  >
                    Dashboard
                  </NavItem>
                  <NavItem
                    to="/profile"
                    variant="mobile"
                    onNavigate={() => setMobileNavOpen(false)}
                  >
                    Profile
                  </NavItem>
                </NavFolder>

                <NavFolder label="Operations" defaultOpen variant="mobile">
                  <NavItem
                    to="/schedule"
                    variant="mobile"
                    onNavigate={() => setMobileNavOpen(false)}
                  >
                    Calendar
                  </NavItem>
                  <NavItem
                    to="/bookings"
                    end={false}
                    variant="mobile"
                    onNavigate={() => setMobileNavOpen(false)}
                  >
                    Bookings
                  </NavItem>
                  {!isClient && (
                    <NavItem
                      to="/my-bookings"
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      My bookings
                    </NavItem>
                  )}
                  {isClient && (
                    <NavItem
                      to="/saved"
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      Saved
                    </NavItem>
                  )}
                  {canManageStudio && clientsPageEnabled && (
                    <NavItem
                      to="/clients"
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      Clients
                    </NavItem>
                  )}
                  {canManageStudio && (
                    <NavItem
                      to="/templates"
                      end={false}
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      Classes
                    </NavItem>
                  )}
                </NavFolder>

                {(isOwner || isModerator) && (
                  <NavFolder label="Owner" defaultOpen variant="mobile">
                    <NavItem
                      to="/owner"
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      Owner
                    </NavItem>
                    <NavItem
                      to="/owner/instructor-payouts"
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      Instructor payouts
                    </NavItem>
                    <NavItem
                      to="/locations"
                      variant="mobile"
                      onNavigate={() => setMobileNavOpen(false)}
                    >
                      Locations
                    </NavItem>
                  </NavFolder>
                )}
              </div>
            </nav>

            {isImpersonating && user && (
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  stopImpersonation();
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-500/20"
              >
                Return to owner view
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  signOut();
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      <main className="flex min-h-0 h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 md:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-expanded={mobileNavOpen}
            >
              <span className="sr-only">Toggle navigation</span>
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-3 bg-slate-300" />
                <span className="block h-0.5 w-3 bg-slate-300" />
                <span className="block h-0.5 w-3 bg-slate-300" />
              </span>
            </button>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="min-w-0 truncate">{dashboardTitle}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            {isClient && studios.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="uppercase tracking-[0.18em] text-slate-500">
                  Studio
                </span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={selectedStudioId || ""}
                  onChange={(e) => setSelectedStudioId(e.target.value || null)}
                >
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {locations.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
                <span className="uppercase tracking-[0.18em] text-slate-500">
                  Location
                </span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={locationId || ""}
                  onChange={(e) => setLocationId(e.target.value || null)}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀︎" : "☾"}
            </button>
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="hidden sm:flex flex-col leading-tight">
                    <span className="font-medium max-w-[140px] truncate">
                      {user.name || user.email}
                    </span>
                    <span className="text-[11px] text-slate-400 uppercase tracking-[0.18em]">
                      {(user.roleName || "").toString().toUpperCase() ||
                        "OWNER"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="hidden sm:inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/signin"
                  className="text-xs font-medium text-slate-200 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400 transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </header>
        {isImpersonating && user && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-[11px] text-amber-100">
            <div className="flex flex-col">
              <span className="font-semibold tracking-[0.18em] uppercase">
                Viewing as {user.name || "selected user"}
              </span>
              {impersonator && (
                <span className="text-[10px] text-amber-200/80">
                  {dashboardTitle}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={stopImpersonation}
              className="inline-flex items-center rounded-full border border-amber-400 px-3 py-1 text-[11px] font-semibold text-amber-50 hover:bg-amber-500/20"
            >
              Return to owner view
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function ClientsRouteGate() {
  const { data } = useQuery(STUDIO_SETTINGS);
  const clientsPageEnabled = data?.studioSettings?.clientsPageEnabled !== false;

  if (!clientsPageEnabled) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ClientsPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/signup/owner"
          element={<SignUpPortal accountType="OWNER" />}
        />
        <Route
          path="/signup/client"
          element={<SignUpPortal accountType="CLIENT" />}
        />
        {/* Public class landing page — no auth required */}
        <Route
          path="/c/:studioCode/:templateId"
          element={<PublicClassDetail />}
        />
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageSpinner />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageSpinner />}>
                  <Profile />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner"
            element={
              <ProtectedRoute>
                <Owner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/instructor-payouts"
            element={
              <ProtectedRoute>
                <InstructorPayoutsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <LocationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <RoleGate allow={["owner", "staff", "moderator", "godmode"]}>
                <Templates />
              </RoleGate>
            }
          />
          <Route path="/templates/:id/sessions" element={<Sessions />} />
          <Route
            path="/classes/:templateId"
            element={
              <ProtectedRoute>
                <ClassDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/:id"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route path="/schedule" element={<Schedule />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <BookingsPage scope="mine" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <ProtectedRoute>
                <BookingShow />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />
          <Route path="/favorites" element={<Navigate to="/saved" replace />} />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsRouteGate />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
