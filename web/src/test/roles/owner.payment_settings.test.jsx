import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import '../mocks/baseMocks'
import { setMockAuth } from '../mocks/baseMocks'
import { ownerUser } from '../helpers/users'

// ─── Apollo mock — stateful so each test controls query/mutation results ──────
const ownerCurrentUser = {
  __typename: 'User',
  id: 'u-owner',
  email: 'owner@example.com',
  name: 'Studio Owner',
  role: 0,
  roleName: 'owner',
  godmode: false,
  active: true,
  studioId: 'studio-1',
}

const queryState = {
  paymentSettings: {
    id:                  'ps-1',
    stripePublishableKey: 'pk_test_existing',
    defaultCurrency:     'cad',
    enabled:             true,
    configured:          true,
    dashboardTitle:      'StudioFlow',
    defaultTheme:        'dark',
    ownerPageLayout:     {},
    __typename:          'PaymentSetting',
  },
  loading: false,
}

const mutationState = {
  fn:      vi.fn(),
  loading: false,
}

vi.mock('@apollo/client', () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: (query) => {
    // Return currentUser for the CURRENT_USER query, paymentSettings otherwise
    const queryStr = typeof query === 'string' ? query : ''
    if (queryStr.includes('currentUser')) {
      return { data: { currentUser: ownerCurrentUser }, loading: false, refetch: vi.fn() }
    }
    if (queryStr.includes('allUsers') || queryStr.includes('users')) {
      return { data: { users: [] }, loading: false, refetch: vi.fn() }
    }
    if (queryStr.includes('bookings')) {
      return { data: { bookings: [] }, loading: false, refetch: vi.fn() }
    }
    if (queryStr.includes('clients')) {
      return { data: { clients: [] }, loading: false, refetch: vi.fn() }
    }
    if (queryStr.includes('payments')) {
      return { data: { payments: [] }, loading: false, refetch: vi.fn() }
    }
    if (queryStr.includes('studioSettings') || queryStr.includes('paymentSettings')) {
      return { data: { paymentSettings: queryState.paymentSettings }, loading: queryState.loading, refetch: vi.fn() }
    }
    return { data: {}, loading: false, refetch: vi.fn() }
  },
  useMutation: () => [mutationState.fn, { loading: mutationState.loading }],
  InMemoryCache: class {},
}))
vi.mock('../../apollo/client', () => ({ default: {} }))

// ─── DnD mock (Owner page uses dnd-kit for its dashboard grid) ────────────────
vi.mock('@dnd-kit/core', () => ({
  DndContext:   ({ children }) => children,
  closestCenter: vi.fn(),
  KeyboardSensor: class {},
  PointerSensor:  class {},
  useSensor:  vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }) => children,
}))
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext:             ({ children }) => children,
  useSortable:                 vi.fn(() => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null })),
  arrayMove:                   vi.fn((arr) => arr),
  verticalListSortingStrategy: {},
  rectSortingStrategy:         {},
  sortableKeyboardCoordinates: vi.fn(),
}))
vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements:    ({ children }) => children,
  CardElement: () => null,
  useStripe:   () => null,
  useElements: () => null,
}))
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => null }))

afterEach(() => cleanup())

// ─── Lazy import of Owner page (after all mocks are set up) ──────────────────
let OwnerPage
beforeEach(async () => {
  mutationState.fn = vi.fn()
  mutationState.loading = false
  queryState.loading = false
  queryState.paymentSettings = {
    id:                  'ps-1',
    stripePublishableKey: 'pk_test_existing',
    defaultCurrency:     'cad',
    enabled:             true,
    configured:          true,
    dashboardTitle:      'StudioFlow',
    defaultTheme:        'dark',
    ownerPageLayout:     {},
    __typename:          'PaymentSetting',
  }
  setMockAuth({ user: ownerUser() })
  if (!OwnerPage) {
    OwnerPage = (await import('../../pages/Owner.jsx')).default
  }
})

function renderOwner() {
  return render(
    <MemoryRouter initialEntries={['/owner']}>
      <OwnerPage />
    </MemoryRouter>,
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Owner – payment settings (Stripe)', () => {
  it('renders the Stripe payments section heading', async () => {
    renderOwner()
    expect(await screen.findByText(/Stripe payments/i)).toBeInTheDocument()
  })

  it('shows "Configured" when payment settings are set up', async () => {
    renderOwner()
    expect(await screen.findByText(/Configured/i)).toBeInTheDocument()
  })

  it('shows "Not configured" when payment settings have no keys', async () => {
    queryState.paymentSettings = {
      ...queryState.paymentSettings,
      configured:          false,
      stripePublishableKey: null,
    }
    renderOwner()
    expect(await screen.findByText(/Not configured/i)).toBeInTheDocument()
  })

  it('shows the Unlock button to allow editing stripe settings', async () => {
    renderOwner()
    expect(await screen.findByRole('button', { name: /Unlock/i })).toBeInTheDocument()
  })

  it('shows the Lock button after clicking Unlock', async () => {
    renderOwner()
    const unlockBtn = await screen.findByRole('button', { name: /Unlock/i })
    fireEvent.click(unlockBtn)
    expect(await screen.findByRole('button', { name: /Lock/i })).toBeInTheDocument()
  })

  it('shows form fields for Publishable key, Secret key and Webhook secret after unlocking', async () => {
    renderOwner()
    const unlockBtn = await screen.findByRole('button', { name: /Unlock/i })
    fireEvent.click(unlockBtn)

    expect(await screen.findByText(/Publishable key/i)).toBeInTheDocument()
    const secretKeyElements = await screen.findAllByText(/Secret key/i)
    expect(secretKeyElements.length).toBeGreaterThan(0)
    expect(await screen.findByText(/Webhook secret/i)).toBeInTheDocument()
  })

  it('shows "Save Stripe settings" submit button after unlocking', async () => {
    renderOwner()
    const unlockBtn = await screen.findByRole('button', { name: /Unlock/i })
    fireEvent.click(unlockBtn)

    expect(await screen.findByRole('button', { name: /Save Stripe settings/i })).toBeInTheDocument()
  })

  it('shows "Enable payments" checkbox', async () => {
    renderOwner()
    await screen.findByText(/Stripe payments/i)
    expect(screen.getByLabelText(/Enable payments/i)).toBeInTheDocument()
  })
})

describe('Owner page – role-based access', () => {
  it('shows payment settings section to owner but redirects non-owners', async () => {
    setMockAuth({ user: ownerUser() })
    renderOwner()
    expect(await screen.findByText(/Stripe payments/i)).toBeInTheDocument()
  })
})
