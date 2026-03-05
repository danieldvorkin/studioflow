import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────
const addToast = vi.fn()
vi.mock('../../components/ToastProvider', () => ({
  useToast:    () => ({ addToast }),
  ToastProvider: ({ children }) => children,
}))

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id:       'staff-user-1',
      email:    'staff@example.com',
      name:     'Staff Member',
      role:     1,
      roleName: 'staff',
      godmode:  false,
      active:   true,
    },
    loading: false,
    signOut: vi.fn(),
    isImpersonating: false,
  }),
  AuthProvider: ({ children }) => children,
}))

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn(), applyTheme: vi.fn(), clearThemeOverride: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('../../location/LocationProvider', () => ({
  useLocationContext: () => ({ locations: [], locationId: null, setLocationId: vi.fn() }),
  LocationProvider:   ({ children }) => children,
}))

// ─── Page import ──────────────────────────────────────────────────────────────
import SessionManage from '../../pages/SessionManage.jsx'
import { SESSION_BOOKINGS } from '../../apollo/queries.js'
import { CANCEL_BOOKING, MARK_NO_SHOW_BOOKING, SEND_BOOKING_PAYMENT_REMINDER } from '../../apollo/mutations.js'

// ─── Shared constants ─────────────────────────────────────────────────────────
const SESSION_ID = 'sess-staff-1'

function makeBooking(overrides = {}) {
  return {
    __typename: 'Booking',
    id:         'b-staff-1',
    studioId:   'studio-1',
    slug:       'xyz789',
    status:     'booked',
    paid:       false,
    priceCents: 2500,
    archived:   false,
    createdAt:  new Date('2026-03-01T10:00:00Z').toISOString(),
    payment:    null,
    client: {
      __typename: 'Client',
      id:         'c-staff-1',
      name:       'Client One',
      email:      'client@example.com',
    },
    classSession: {
      __typename:    'ClassSession',
      id:            SESSION_ID,
      startTime:     new Date('2026-03-15T10:00:00Z').toISOString(),
      endTime:       new Date('2026-03-15T11:00:00Z').toISOString(),
      capacity:      10,
      room:          'Studio B',
      instructor:    { __typename: 'User', id: 'inst-1', name: 'Instructor' },
      classTemplate: {
        __typename:  'ClassTemplate',
        id:          't-1',
        title:       'Pilates Flow',
        priceCents:  2500,
        currency:    'cad',
      },
    },
    ...overrides,
  }
}

function sessionBookingsMock(bookings = []) {
  return {
    request: { query: SESSION_BOOKINGS, variables: { classSessionId: SESSION_ID } },
    result:  { data: { bookings } },
  }
}

function renderSessionManage(mocks = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={[`/sessions/${SESSION_ID}/manage`]}>
        <Routes>
          <Route path="/sessions/:id/manage" element={<SessionManage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Staff – SessionManage: mark no-show and cancel', () => {
  beforeEach(() => {
    addToast.mockReset()
  })
  afterEach(() => cleanup())

  it('renders the session roster with a booked client', async () => {
    renderSessionManage([sessionBookingsMock([makeBooking()])])
    expect(await screen.findByText('Client One')).toBeInTheDocument()
    expect(screen.getByText('Pilates Flow')).toBeInTheDocument()
  })

  it('shows the No-Show button for a booked (unpaid) booking', async () => {
    renderSessionManage([sessionBookingsMock([makeBooking()])])
    await screen.findByText('Client One')
    expect(screen.getByRole('button', { name: 'No-Show' })).toBeInTheDocument()
  })

  it('calls markNoShowBooking and toasts on success', async () => {
    const booking = makeBooking()
    const mocks = [
      sessionBookingsMock([booking]),
      {
        request: { query: MARK_NO_SHOW_BOOKING, variables: { id: 'b-staff-1' } },
        result:  { data: { markNoShowBooking: { success: true, errors: [] } } },
      },
      sessionBookingsMock([]),
    ]

    renderSessionManage(mocks)
    await screen.findByText('Client One')

    fireEvent.click(screen.getByRole('button', { name: 'No-Show' }))

    await waitFor(() => expect(addToast).toHaveBeenCalled())
    const messages = addToast.mock.calls.map((c) => c?.[0]?.message).filter(Boolean)
    expect(messages.join(' ')).toMatch(/no-show/i)
  })

  it('shows the Cancel button for a booked booking', async () => {
    renderSessionManage([sessionBookingsMock([makeBooking()])])
    await screen.findByText('Client One')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls cancelBooking and toasts on success', async () => {
    const booking = makeBooking()
    const mocks = [
      sessionBookingsMock([booking]),
      {
        request: { query: CANCEL_BOOKING, variables: { id: 'b-staff-1' } },
        result:  { data: { cancelBooking: { success: true, errors: [] } } },
      },
      sessionBookingsMock([]),
    ]

    renderSessionManage(mocks)
    await screen.findByText('Client One')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(addToast).toHaveBeenCalled())
    const messages = addToast.mock.calls.map((c) => c?.[0]?.message).filter(Boolean)
    expect(messages.join(' ')).toMatch(/cancelled/i)
  })

  it('shows the Send reminder button for unpaid bookings', async () => {
    renderSessionManage([sessionBookingsMock([makeBooking({ paid: false })])])
    await screen.findByText('Client One')
    expect(screen.getByRole('button', { name: 'Send reminder' })).toBeInTheDocument()
  })

  it('calls sendBookingPaymentReminder and toasts on success', async () => {
    const booking = makeBooking({ paid: false })
    const mocks = [
      sessionBookingsMock([booking]),
      {
        request: {
          query: SEND_BOOKING_PAYMENT_REMINDER,
          variables: { bookingId: 'b-staff-1' },
        },
        result: {
          data: {
            sendBookingPaymentReminder: {
              success: true,
              checkoutUrl: 'https://pay.stripe.com/test',
              errors: [],
            },
          },
        },
      },
      sessionBookingsMock([booking]),
    ]

    renderSessionManage(mocks)
    await screen.findByText('Client One')

    fireEvent.click(screen.getByRole('button', { name: 'Send reminder' }))

    await waitFor(() => expect(addToast).toHaveBeenCalled())
    const messages = addToast.mock.calls.map((c) => c?.[0]?.message).filter(Boolean)
    expect(messages.join(' ')).toMatch(/reminder/i)
  })

  it('does NOT show Send reminder for paid bookings', async () => {
    renderSessionManage([sessionBookingsMock([makeBooking({ paid: true })])])
    await screen.findByText('Client One')
    expect(screen.queryByRole('button', { name: 'Send reminder' })).not.toBeInTheDocument()
  })

  it('shows the No-Show button even for paid bookings', async () => {
    renderSessionManage([sessionBookingsMock([makeBooking({ paid: true })])])
    await screen.findByText('Client One')
    expect(screen.getByRole('button', { name: 'No-Show' })).toBeInTheDocument()
  })
})
