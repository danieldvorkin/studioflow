import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { clientUser } from '../helpers/users'
import { MY_BOOKINGS, CLASS_SESSIONS, MY_FAVORITE_CLASS_SESSIONS } from '../../apollo/queries'
import Sessions from '../../pages/Sessions.jsx'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

beforeEach(() => {
  setMockAuth({ user: clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' }) })
})

describe('Client Sessions workflow', () => {
  it('shows a Booked link when the client already has a booking', async () => {
    const session = {
      id: 'session-1',
      startTime: new Date('2026-02-28T17:00:00.000Z').toISOString(),
      endTime: new Date('2026-02-28T18:00:00.000Z').toISOString(),
      room: 'Room A',
      capacity: 10,
      seatsAvailable: 0,
      classTemplate: { __typename: 'ClassTemplate', id: 'tmpl-1', title: 'Reformer', priceCents: 2500 },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Instructor One' },
    }

    const booking = {
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
      {
        request: { query: MY_FAVORITE_CLASS_SESSIONS, variables: {} },
        result: { data: { myFavoriteClassSessions: [] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [booking] } },
      },
      {
        request: { query: CLASS_SESSIONS, variables: { from: null, to: null } },
        result: { data: { classSessions: [session] } },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/templates/tmpl-1/sessions']}>
          <Routes>
            <Route path="/templates/:id/sessions" element={<Sessions />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    const bookedLink = await screen.findByRole('link', { name: 'Booked' })
    expect(bookedLink).toHaveAttribute('href', '/bookings/booking-1')
  })
})
