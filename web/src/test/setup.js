import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// Apollo Client uses globalThis.__DEV__ to decide whether to emit noisy
// deprecation warnings (which show up as stderr in Vitest output).
globalThis.__DEV__ = false

import { TextDecoder, TextEncoder } from 'node:util'

// Some dependencies expect TextEncoder/TextDecoder in the global scope.
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder
}

// Stripe.js performs async script loading that can outlive individual tests and
// trigger React updates after the JSDOM environment is torn down.
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}))

afterEach(async () => {
  // Apollo's MockedProvider (and some libraries) resolve requests on a 0ms timer.
  // If a test finishes before those timers fire, React can attempt to commit
  // updates after the JSDOM environment is torn down ("window is not defined").
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
})
