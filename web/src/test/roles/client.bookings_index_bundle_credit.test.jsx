import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter } from 'react-router-dom'

import { setMockAuth, setMockLocationContext } from '../mocks/baseMocks'
import { clientUser } from '../helpers/users'
import { MY_BOOKINGS } from '../../apollo/queries'

import BookingsPage from '../../pages/Bookings.jsx'

vi.mock('../../studio/StudioProvider', () => ({
  useStudio: () => ({
    selectedStudioId: 'studio-1',
    setSelectedStudioId: vi.fn(),
    studios: [],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}))

beforeEach(() => {
  setMockAuth({ user: clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' }) })
  setMockLocationContext({ locationId: null })
})

describe('Client bookings index bundle credit', () => {
  it('shows bundle credit as payment source on the list', async () => {
    const booking = {
      __typename: 'Booking',
      id: 'b-1',
      studioId: 'studio-1',
      slug: null,
      status: 'booked',
      paid: true,
      priceCents: 2500,
      archived: false,
      createdAt: new Date('2026-03-01T10:00:00Z').toISOString(),
      payment: null,
      bundlePurchase: {
        __typename: 'BundlePurchase',
        id: 'bp-1',
        creditsTotal: 10,
        creditsRemaining: 8,
        bundleProduct: {
          __typename: 'BundleProduct',
          id: 'prod-1',
          title: '10 Class Pack',
        },
      },
      client: { __typename: 'Client', id: 'c-1', name: 'Cathy Client', email: 'cathy@example.com' },
      classSession: {
        __typename: 'ClassSession',
        id: 'sess-1',
        startTime: new Date('2026-03-05T10:30:00Z').toISOString(),
        room: 'A',
        instructor: { __typename: 'User', id: 'inst-1', name: 'Alex' },
        classTemplate: { __typename: 'ClassTemplate', id: 't-1', title: 'Reformer', priceCents: 2500, currency: 'cad' },
      },
    }

    const mocks = [
      {
        request: { query: MY_BOOKINGS, variables: { studioLocationId: null, studioId: 'studio-1' } },
        result: { data: { myBookings: [booking] } },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/bookings']}>
          <BookingsPage />
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByText(/Bookings/i)).toBeInTheDocument()
    expect(await screen.findByText(/Payment:\s*Bundle credit/i)).toBeInTheDocument()
    expect(await screen.findByText(/10 Class Pack/i)).toBeInTheDocument()
  })
})
