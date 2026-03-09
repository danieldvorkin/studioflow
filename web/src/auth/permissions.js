export function roleName(user) {
  if (!user) return null;
  if (user.godmode === true) return "godmode";
  const name = (user.roleName || "").toString().toLowerCase();
  if (name) return name;
  if (user.role === 0) return "owner";
  if (user.role === 1) return "staff";
  if (user.role === 2) return "instructor";
  if (user.role === 3) return "client";
  if (user.role === 4) return "moderator";
  return null;
}

export function isGodmode(user) {
  return roleName(user) === "godmode";
}

export function isOwner(user) {
  const role = roleName(user);
  return role === "owner";
}

export function isStaff(user) {
  const role = roleName(user);
  return role === "staff";
}

export function isInstructor(user) {
  const role = roleName(user);
  if (role === "instructor") return true;
  // Owners who have opted in as instructors should also be treated as instructors
  // for session assignment and payouts.
  if (role === "owner" && user?.alsoInstructor === true) return true;
  return false;
}

export function isClient(user) {
  const role = roleName(user);
  return role === "client";
}

export function isModerator(user) {
  const role = roleName(user);
  return role === "moderator";
}

export function canManageTemplates(user) {
  const role = roleName(user);
  return (
    role === "godmode" ||
    role === "owner" ||
    role === "staff" ||
    role === "moderator"
  );
}

export function canViewAllClients(user) {
  const role = roleName(user);
  return (
    role === "godmode" ||
    role === "owner" ||
    role === "staff" ||
    role === "moderator"
  );
}

export function canManageMembershipPlans(user) {
  const role = roleName(user);
  return role === "godmode" || role === "owner" || role === "moderator";
}

export function canProcessPayouts(user) {
  const role = roleName(user);
  return role === "godmode" || role === "owner" || role === "moderator";
}

export function canUpdatePaymentSettings(user) {
  const role = roleName(user);
  return role === "godmode" || role === "owner" || role === "moderator";
}

export function canInviteUsers(user) {
  const role = roleName(user);
  return (
    role === "godmode" ||
    role === "owner" ||
    role === "staff" ||
    role === "moderator"
  );
}

export function canScheduleSessions(user) {
  const role = roleName(user);
  return (
    role === "godmode" ||
    role === "owner" ||
    role === "staff" ||
    role === "instructor"
  );
}

export function canDeleteSessions(user) {
  const role = roleName(user);
  return role === "godmode" || role === "owner" || role === "staff";
}

export function canEditSession(user, session) {
  const role = roleName(user);
  if (role === "godmode" || role === "owner" || role === "staff") return true;
  if (role === "instructor") {
    const sessionInstructorId = session?.instructor?.id;
    return (
      sessionInstructorId &&
      user?.id &&
      sessionInstructorId.toString() === user.id.toString()
    );
  }
  return false;
}
