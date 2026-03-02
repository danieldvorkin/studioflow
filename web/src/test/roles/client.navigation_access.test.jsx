import React from 'react'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { clientUser } from '../helpers/users'
import { studioSettingsMock, currentUserMock } from '../helpers/apolloMocks'
import { MY_BOOKINGS, CLIENTS } from '../../apollo/queries'
import { ownerDashboardDataMocks } from '../helpers/apolloMocks'

let App

beforeAll(async () => {
  App = (await import('../../App.jsx')).default
})

beforeEach(() => {
  setMockAuth({ user: clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' }) })
})

describe('Client role navigation + access guards', () => {
  it('does not show studio-management links (Clients/Classes/Owner) in sidebar', async () => {
    window.history.pushState({}, 'Test', '/my-bookings')

    const user = clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' })

    const myBookingsMock = {
      request: { query: MY_BOOKINGS, variables: { studioLocationId: null, studioId: null } },
      result: { data: { myBookings: [] } },
    }

    const mocks = [studioSettingsMock(), currentUserMock(user), myBookingsMock]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    await screen.findByRole('heading', { name: /my bookings|your bookings|bookings/i })

    expect(screen.queryByRole('link', { name: 'Clients' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Classes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Owner' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Instructor payouts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Locations' })).not.toBeInTheDocument()
  })

  it('shows restricted message when visiting /clients as a client', async () => {
    window.history.pushState({}, 'Test', '/clients')

    const user = clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' })

    const clientsQueryMock = {
      request: { query: CLIENTS, variables: {} },
      result: { data: { clients: [] } },
    }

    const mocks = [studioSettingsMock(), currentUserMock(user), clientsQueryMock]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Restricted' })).toBeInTheDocument()
    expect(screen.getByText(/only owners and instructors can view the client list/i)).toBeInTheDocument()
  })

  it('shows owner access only when visiting /owner as a client', async () => {
    window.history.pushState({}, 'Test', '/owner')

    const user = clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' })

    const mocks = [studioSettingsMock(), currentUserMock(user), ...ownerDashboardDataMocks()]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    expect((await screen.findAllByRole('heading', { name: /owner access only/i })).length).toBeGreaterThan(0)
  })
})
