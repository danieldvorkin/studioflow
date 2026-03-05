import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => null,
}))

vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
}))

import BookingShow from '../../pages/BookingShow.jsx'
import { CURRENT_USER, MY_BOOKINGS, PAYMENT_PUBLIC_SETTINGS, MY_CLIENT } from '../../apollo/queries.js'

const studioId = 'studio-1'
const bookingId = 'b-wait-1'

const waitlistedBooking = {
  __typename: 'Booking',
  id: bookingId,
  studioId,
  slug: null,
  status: 'waitlisted',
  paid: false,
  priceCents: 2400,
  archived: false,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString(),
  payment: null,
  bundlePurchase: null,
  client: { __typename: 'Client', id: 'c-1', name: 'Jane Doe', email: 'jane@example.com' },
  classSession: {
    __typename: 'ClassSession',
    id: 'sess-1',
    startTime: new Date('2026-03-10T10:30:00Z').toISOString(),
    room: 'B',
    instructor: { __typename: 'User', id: 'inst-1', name: 'Instructor' },
    classTemplate: {
      __typename: 'ClassTemplate',
      id: 't-1',
      title: 'Reformer Advanced',
      priceCents: 2400,
      currency: 'cad',
      durationMinutes: 55,
    },
  },
}

const mocks = [
  {
    request: { query: CURRENT_USER, variables: {} },
    result: {
      data: {
        currentUser: {
          __typename: 'User',
          id: 'u-1',
          email: 'jane@example.com',
          name: 'Jane Doe',
          role: 2,
          roleName: 'client',
          active: true,
          availableForSessions: false,
          studioId: 'studio-a',
        },
      },
    },
  },
  {
    request: { query: MY_BOOKINGS, variables: {} },
    result: { data: { myBookings: [waitlistedBooking] } },
  },
  {
    request: { query: PAYMENT_PUBLIC_SETTINGS, variables: { studioId } },
    result: {
      data: {
        paymentPublicSettings: {
          __typename: 'PaymentPublicSetting',
          stripePublishableKey: null,
          defaultCurrency: 'cad',
          enabled: true,
          configured: false,
        },
      },
    },
  },
  {
    request: { query: MY_CLIENT, variables: { studioId } },
    result: { data: { myClient: null } },
  },
]

describe('BookingShow – waitlisted booking', () => {
  it('displays the waitlisted status badge with amber styling', async () => {
    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={[`/bookings/${bookingId}`]}>
          <Routes>
            <Route path="/bookings/:id" element={<BookingShow />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    const badge = await screen.findByText(/waitlisted/i)
    expect(badge).toBeInTheDocument()
    expect(badge.className).toMatch(/amber/)
  })

  it('shows the waitlist explanation banner', async () => {
    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={[`/bookings/${bookingId}`]}>
          <Routes>
            <Route path="/bookings/:id" element={<BookingShow />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByText(/You're on the waitlist/i)).toBeInTheDocument()
    expect(
      screen.getByText(/You'll be automatically confirmed if a spot opens up/i),
    ).toBeInTheDocument()
  })
})
