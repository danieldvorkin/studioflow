export function roleName(user) {
  if (!user) return null
  const name = (user.roleName || '').toString().toLowerCase()
  if (name) return name
  if (user.role === 0) return 'owner'
  if (user.role === 1) return 'staff'
  if (user.role === 2) return 'instructor'
  if (user.role === 3) return 'client'
  return null
}

export function isOwner(user) {
  return roleName(user) === 'owner'
}

export function isStaff(user) {
  return roleName(user) === 'staff'
}

export function isInstructor(user) {
  return roleName(user) === 'instructor'
}

export function canManageTemplates(user) {
  const role = roleName(user)
  return role === 'owner' || role === 'staff' || role === 'instructor'
}

export function canScheduleSessions(user) {
  const role = roleName(user)
  return role === 'owner' || role === 'staff' || role === 'instructor'
}

export function canDeleteSessions(user) {
  const role = roleName(user)
  return role === 'owner' || role === 'staff'
}

export function canEditSession(user, session) {
  const role = roleName(user)
  if (role === 'owner' || role === 'staff') return true
  if (role === 'instructor') {
    const sessionInstructorId = session?.instructor?.id
    return sessionInstructorId && user?.id && sessionInstructorId.toString() === user.id.toString()
  }
  return false
}
