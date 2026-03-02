export function normalizeStripeEmail(email) {
  const value = (email || '').trim()
  if (!value) return undefined

  // Stripe validates email format; keep this intentionally simple.
  // Requires a dot in the domain so addresses like `name@test` are omitted.
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  return isValid ? value : undefined
}
