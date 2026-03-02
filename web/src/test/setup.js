import '@testing-library/jest-dom/vitest'

// Apollo Client uses globalThis.__DEV__ to decide whether to emit noisy
// deprecation warnings (which show up as stderr in Vitest output).
globalThis.__DEV__ = false

import { TextDecoder, TextEncoder } from 'node:util'

// Some dependencies expect TextEncoder/TextDecoder in the global scope.
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder
}
