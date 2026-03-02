import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../components/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => null,
}))

import BookingShow from '../pages/BookingShow.jsx'
import { BOOKINGS, CURRENT_USER } from '../apollo/queries.js'

describe('BookingShow regression', () => {
  it('does not crash across loading → loaded re-render', async () => {
    const cache = new InMemoryCache()
    const mocks = [
      {
        request: { query: CURRENT_USER, variables: {} },
        result: {
          data: {
            currentUser: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: 0,
              roleName: 'owner',
              active: true,
              availableForSessions: true,
              __typename: 'User',
            },
          },
        },
      },
      {
        request: { query: BOOKINGS, variables: {} },
        result: {
          data: {
            bookings: [],
          },
        },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={cache}>
        <MemoryRouter initialEntries={['/bookings/123']}>
          <Routes>
            <Route path="/bookings/:id" element={<BookingShow />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(screen.getByText(/Loading booking/i)).toBeInTheDocument()

    // When the query resolves, the booking won’t be found, but the component
    // should still render safely (no hook order crash).
    expect(await screen.findByText(/Booking not found/i)).toBeInTheDocument()
  })
})
