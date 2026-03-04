export function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 0,
    roleName: 'owner',
    active: true,
    availableForSessions: true,
    ...overrides,
  }
}

export function ownerUser(overrides = {}) {
  return makeUser({ role: 0, roleName: 'owner', ...overrides })
}

export function staffUser(overrides = {}) {
  return makeUser({ role: 1, roleName: 'staff', ...overrides })
}

export function instructorUser(overrides = {}) {
  return makeUser({ role: 2, roleName: 'instructor', ...overrides })
}

export function clientUser(overrides = {}) {
  // role/roleName are not perfectly consistent across the app, so we set both.
  return makeUser({ role: 3, roleName: 'client', ...overrides })
}

export function moderatorUser(overrides = {}) {
  return makeUser({ role: 4, roleName: 'moderator', ...overrides })
}
