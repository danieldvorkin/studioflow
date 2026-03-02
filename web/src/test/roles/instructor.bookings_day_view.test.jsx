import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { setMockAuth } from '../mocks/baseMocks'
import { instructorUser } from '../helpers/users'
import { BOOKINGS } from '../../apollo/queries'
import BookingsPage from '../../pages/Bookings.jsx'

vi.mock('../../studio/StudioProvider', () => ({
  useStudio: () => ({
    selectedStudioId: null,

    await act(async () => {
      await vi.runAllTimersAsync()
    })
    setSelectedStudioId: vi.fn(),
    studios: [],
    expect(screen.getByText('Today')).toBeInTheDocument()
  }),
  StudioProvider: ({ children }) => children,
    expect(screen.getByText('Riley Moore')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
describe('Instructor Bookings day view', () => {
  beforeEach(() => {
    const modify = screen.getByRole('link', { name: 'Modify session' })
    // March 1, 2026 9:00am local
    vi.setSystemTime(new Date('2026-03-01T09:00:00'))

    setMockAuth({ user: instructorUser({ id: 'inst-1', name: 'Alex Chen', email: 'alex@example.com' }) })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows Today first, attendee payment status, and modify-session link', async () => {
    const todaySession = {
      __typename: 'ClassSession',
      id: 'sess-1',
      startTime: new Date('2026-03-01T14:30:00').toISOString(),
      room: 'A',
      classTemplate: { __typename: 'ClassTemplate', id: 'tmpl-1', title: 'Morning Mat Reset', priceCents: 2400 },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex Chen' },
    }

    const tomorrowSession = {
      __typename: 'ClassSession',
      id: 'sess-2',
      startTime: new Date('2026-03-02T14:30:00').toISOString(),
      room: 'B',
      classTemplate: { __typename: 'ClassTemplate', id: 'tmpl-2', title: 'Reformer', priceCents: 2500 },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex Chen' },
    }

    const bookings = [
      {
        __typename: 'Booking',
        id: 'b-1',
        slug: 'b-1',
        status: 'booked',
        paid: true,
        priceCents: 2400,
        archived: false,
        createdAt: new Date().toISOString(),
        payment: { __typename: 'Payment', id: 'p-1', status: 'succeeded', amountCents: 2400, currency: 'cad', errorMessage: null, createdAt: new Date().toISOString() },
        client: { __typename: 'Client', id: 'c-1', name: 'Riley Moore', email: 'riley@example.com' },
        classSession: todaySession,
      },
      {
        __typename: 'Booking',
        id: 'b-2',
        slug: 'b-2',
        status: 'waitlisted',
        paid: false,
        priceCents: 2500,
        archived: false,
        createdAt: new Date().toISOString(),
        payment: null,
        client: { __typename: 'Client', id: 'c-2', name: 'Pat Student', email: 'pat@example.com' },
        classSession: tomorrowSession,
      },
    ]

    const mocks = [
      {
        request: { query: BOOKINGS, variables: { studioLocationId: null } },
        result: { data: { bookings } },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/bookings']}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    await vi.runOnlyPendingTimersAsync()

    // Today section should exist.
    expect(await screen.findByText('Today')).toBeInTheDocument()

    // Attendee list shows paid/unpaid status.
    expect(await screen.findByText('Riley Moore')).toBeInTheDocument()
    expect(await screen.findByText('Paid')).toBeInTheDocument()

    // Modify session link for today's session.
    const modify = await screen.findByRole('link', { name: 'Modify session' })
    expect(modify).toHaveAttribute('href', '/templates/tmpl-1/sessions')
  })
})
