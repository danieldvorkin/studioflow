import React from 'react'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { staffUser } from '../helpers/users'
import {
  studioSettingsMock,
  paymentPublicSettingsMock,
  classSessionsMock,
  currentUserMock,
  myClientMock,
} from '../helpers/apolloMocks'
import { CLIENTS } from '../../apollo/queries'

let App

beforeAll(async () => {
  App = (await import('../../App.jsx')).default
})

beforeEach(() => {
  setMockAuth({ user: staffUser() })
})

describe('Staff booking flow (existing client vs saved card)', () => {
  it('hides saved-card choice when booking for a different existing client', async () => {
    const staff = staffUser({ id: 'staff-1', email: 'staff@example.com', name: 'Staff Member' })

    // Keep ProtectedRoute (useAuth) and BookingForm (CURRENT_USER query) consistent.
    setMockAuth({ user: staff })

    window.history.pushState({}, 'Test', '/booking/1')

    const session = {
      id: '1',
      startTime: new Date('2026-02-28T17:00:00.000Z').toISOString(),
      endTime: new Date('2026-02-28T18:00:00.000Z').toISOString(),
      capacity: 10,
      room: 'Room A',
      seatsAvailable: 8,
      classTemplate: {
        __typename: 'ClassTemplate',
        id: 'tmpl-1',
        title: 'Reformer',
        priceCents: 2500,
        currency: 'cad',
        durationMinutes: 50,
      },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Instructor One' },
    }

    const myClient = {
      id: 'client-1',
      name: 'Staff-as-Client',
      email: staff.email,
      stripeCustomerId: 'cus_123',
      stripeDefaultPaymentMethodId: 'pm_default',
      clientPaymentMethods: [
        {
          id: 'cpm-1',
          stripePaymentMethodId: 'pm_default',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2030,
          default: true,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    const clientsMock = {
      request: { query: CLIENTS, variables: {} },
      result: {
        data: {
          clients: [
            { __typename: 'Client', id: 'client-1', name: 'Staff-as-Client', email: staff.email, phone: null, user: { __typename: 'User', id: staff.id } },
            { __typename: 'Client', id: 'client-2', name: 'Other Client', email: 'other@example.com', phone: null, user: null },
          ],
        },
      },
    }

    const mocks = [
      studioSettingsMock(),
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123' }),
      // Some call sites may implicitly treat omitted variables as null; include both shapes.
      classSessionsMock({ sessions: [session], variables: { from: null, to: null } }),
      classSessionsMock({ sessions: [session], variables: { from: null, to: null, studioLocationId: null } }),
      currentUserMock(staff),
      myClientMock(myClient),
      clientsMock,
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    // BookingForm should render (prefer a unique string from the form).
    expect(await screen.findByText('Payment')).toBeInTheDocument()

    // Initially (new client), saved-card choice should NOT be available.
    expect(screen.queryByText('Use a saved card')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Existing client'))

    const clientSelect = screen.getByRole('combobox')

    // Selecting *your own* client should keep saved cards enabled.
    fireEvent.change(clientSelect, { target: { value: 'client-1' } })
    expect(await screen.findByText('Use a saved card')).toBeInTheDocument()

    // Selecting a different client should disable saved cards.
    fireEvent.change(clientSelect, { target: { value: 'client-2' } })
    await waitFor(() => {
      expect(screen.queryByText('Use a saved card')).not.toBeInTheDocument()
    })

    // And the new-card UI stays available.
    expect(screen.getByTestId('card-element')).toBeInTheDocument()
  })
})
