function envString(name) {
  const v = import.meta?.env?.[name]
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length ? trimmed : null
}

export function getDevSeedPassword() {
  return envString('VITE_SEED_PASSWORD') || 'password'
}

export function getDevSeedAccounts() {
  const password = getDevSeedPassword()

  const ownerEmail = envString('VITE_SEED_OWNER_EMAIL') || 'owner@studio.example.com'
  const secondaryOwnerEmail = envString('VITE_SEED_SECONDARY_OWNER_EMAIL') || 'dvorkin212@gmail.com'
  const staffEmail = envString('VITE_SEED_STAFF_EMAIL') || 'staff@studio.example.com'
  const staffEmail2 = envString('VITE_SEED_STAFF_EMAIL_2')
  const ownerEmail2 = envString('VITE_SEED_OWNER_EMAIL_2')

  return [
    { key: 'owner', label: 'Owner', email: ownerEmail, password },
    { key: 'owner-secondary', label: 'Owner2', email: secondaryOwnerEmail, password },
    ownerEmail2 ? { key: 'owner-2', label: 'OwnerAlt', email: ownerEmail2, password } : null,
    { key: 'staff', label: 'Staff', email: staffEmail, password },
    staffEmail2 ? { key: 'staff-2', label: 'StaffAlt', email: staffEmail2, password } : null,
    { key: 'instructor-mia', label: 'I:Mia', email: 'mia.torres@studio.example.com', password },
    { key: 'instructor-alex', label: 'I:Alex', email: 'alex.chen@studio.example.com', password },
    { key: 'instructor-sofia', label: 'I:Sofia', email: 'sofia.rossi@studio.example.com', password },
    { key: 'client-jordan', label: 'C:Jordan', email: 'jordan.blake@example.com', password },
    { key: 'client-taylor', label: 'C:Taylor', email: 'taylor.kim@example.com', password },
    { key: 'client-sam', label: 'C:Sam', email: 'sam.rivera@example.com', password },
    { key: 'client-riley', label: 'C:Riley', email: 'riley.moore@example.com', password },
  ].filter(Boolean)
}
