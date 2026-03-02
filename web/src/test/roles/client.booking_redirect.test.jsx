import React from 'react'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { clientUser } from '../helpers/users'
import { studioSettingsMock, currentUserMock, paymentPublicSettingsMock, myClientMock } from '../helpers/apolloMocks'
import { MY_BOOKINGS, CLASS_SESSIONS } from '../../apollo/queries'

let App

beforeAll(async () => {
  App = (await import('../../App.jsx')).default
})

beforeEach(() => {
  setMockAuth({ user: clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' }) })
})

describe('Client Booking redirect workflow', () => {
  it('redirects /booking/:id to /bookings/:bookingId if already booked', async () => {
    const user = clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' })

    window.history.pushState({}, 'Test', '/booking/1')

    const session = {
      __typename: 'ClassSession',
      id: '1',
      startTime: new Date('2026-02-28T17:00:00.000Z').toISOString(),
      endTime: new Date('2026-02-28T18:00:00.000Z').toISOString(),
      room: 'Room A',
      capacity: 10,
      seatsAvailable: 8,
      classTemplate: { __typename: 'ClassTemplate', id: 'tmpl-1', title: 'Reformer', priceCents: 2500, currency: 'cad', durationMinutes: 50 },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Instructor One' },
    }

    const booking = {
      __typename: 'Booking',
      id: 'booking-1',
      studioId: 'studio-1',
      slug: 'booking-1',
      status: 'confirmed',
      paid: true,
      priceCents: 2500,
      archived: false,
      createdAt: new Date().toISOString(),
      payment: null,
      client: { __typename: 'Client', id: 'client-1', name: 'Cathy Client', email: 'cathy@example.com' },
      classSession: session,
    }

    const mocks = [
      studioSettingsMock(),
      currentUserMock(user),
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123' }),
      myClientMock(null),
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123' }, { studioId: 'studio-1' }),
      myClientMock(null, { studioId: 'studio-1' }),
      // Booking page needs sessions list to find the session by id.
      {
        request: { query: CLASS_SESSIONS, variables: { from: null, to: null } },
        result: { data: { classSessions: [session] } },
      },
      // BookingForm uses MY_BOOKINGS (no variables).
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [booking] } },
      },
      // Redirect can cause these to be queried again; MockedProvider mocks are single-use.
      currentUserMock(user),
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [booking] } },
      },
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123' }, { studioId: 'studio-1' }),
      myClientMock(null, { studioId: 'studio-1' }),
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    await waitFor(() => {
      expect(window.location.pathname).toBe('/bookings/booking-1')
    })

    // BookingShow should be mounted after redirect.
    expect(await screen.findByText(/Loading booking/i)).toBeInTheDocument()
  })
})
