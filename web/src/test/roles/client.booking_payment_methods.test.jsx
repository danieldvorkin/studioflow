import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { setMockAuth, getMockAddToast } from '../mocks/baseMocks'
import { clientUser } from '../helpers/users'
import { paymentPublicSettingsMock, myClientMock } from '../helpers/apolloMocks'
import {
  BUNDLE_PRODUCTS_FOR_CLASS_SESSION,
  CLASS_SESSIONS,
  MY_BOOKINGS,
  MY_BUNDLE_PURCHASES,
} from '../../apollo/queries'
import { CREATE_BOOKING_WITH_BUNDLE, CREATE_BOOKING_WITH_PAYMENT } from '../../apollo/mutations'

import Booking from '../../pages/Booking.jsx'

vi.mock('../../studio/StudioProvider', () => ({
  useStudio: () => ({
    selectedStudioId: null,
    setSelectedStudioId: vi.fn(),
    studios: [],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}))

beforeEach(() => {
  setMockAuth({ user: clientUser({ id: 'client-user-1', name: 'Cathy Client', email: 'cathy@example.com' }) })
  getMockAddToast().mockClear()
})

describe('Client Booking payment methods', () => {
  it('can book with a saved card without hitting the own-profile error', async () => {
    const session = {
      __typename: 'ClassSession',
      id: '1',
      startTime: new Date('2026-03-02T10:30:00.000Z').toISOString(),
      endTime: new Date('2026-03-02T11:20:00.000Z').toISOString(),
      room: 'Room A',
      capacity: 10,
      seatsAvailable: 8,
      classTemplate: {
        __typename: 'ClassTemplate',
        id: 'tmpl-1',
        title: 'Morning Mat Reset',
        priceCents: 2400,
        currency: 'cad',
        durationMinutes: 50,
      },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex Chen' },
    }

    const myClient = {
      id: 'client-1',
      name: 'Cathy Client',
      email: 'cathy@example.com',
      stripeCustomerId: 'cus_123',
      stripeDefaultPaymentMethodId: 'pm_default',
      clientPaymentMethods: [
        {
          id: 'cpm-1',
          stripePaymentMethodId: 'pm_default',
          brand: 'visa',
          last4: '4242',
          expMonth: 4,
          expYear: 2029,
          default: true,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    const mocks = [
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123' }),
      myClientMock(myClient),
      {
        request: { query: CLASS_SESSIONS, variables: { from: null, to: null } },
        result: { data: { classSessions: [session] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [] } },
      },
      {
        request: {
          query: CREATE_BOOKING_WITH_PAYMENT,
          variables: { clientId: 'client-1', classSessionId: '1', paymentMethodId: 'pm_default' },
        },
        result: {
          data: {
            createBookingWithPayment: {
              booking: { __typename: 'Booking', id: 'booking-1', status: 'booked' },
              payment: { __typename: 'Payment', id: 'pay-1', amountCents: 2400, currency: 'cad', status: 'succeeded' },
              errors: [],
              __typename: 'CreateBookingWithPaymentPayload',
            },
          },
        },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/booking/1']}>
          <Routes>
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    // Wait for payment section to render.
    expect(await screen.findByText('Payment')).toBeInTheDocument()

    // Choose saved card path.
    fireEvent.click(screen.getByLabelText('Use a saved card'))

    const submit = screen.getByRole('button', { name: /book/i })
    fireEvent.click(submit)

    await waitFor(() => {
      const addToast = getMockAddToast()
      const calls = addToast.mock.calls.map((c) => c[0])
      expect(calls.some((c) => c?.type === 'error' && /Saved card can only be used/i.test(c?.message || ''))).toBe(false)
      expect(calls.some((c) => c?.type === 'success' && /Booking confirmed/i.test(c?.message || ''))).toBe(true)
    })
  })

  it('can book with a new card (clientId omitted) and still succeeds', async () => {
    const session = {
      __typename: 'ClassSession',
      id: '1',
      startTime: new Date('2026-03-02T10:30:00.000Z').toISOString(),
      endTime: new Date('2026-03-02T11:20:00.000Z').toISOString(),
      room: 'Room A',
      capacity: 10,
      seatsAvailable: 8,
      classTemplate: {
        __typename: 'ClassTemplate',
        id: 'tmpl-1',
        title: 'Morning Mat Reset',
        priceCents: 2400,
        currency: 'cad',
        durationMinutes: 50,
      },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex Chen' },
    }

    const mocks = [
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123' }),
      myClientMock(null),
      {
        request: { query: CLASS_SESSIONS, variables: { from: null, to: null } },
        result: { data: { classSessions: [session] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [] } },
      },
      {
        request: {
          query: CREATE_BOOKING_WITH_PAYMENT,
          variables: { clientId: null, classSessionId: '1', paymentMethodId: 'pm_test_new' },
        },
        result: {
          data: {
            createBookingWithPayment: {
              booking: { __typename: 'Booking', id: 'booking-2', status: 'booked' },
              payment: { __typename: 'Payment', id: 'pay-2', amountCents: 2400, currency: 'cad', status: 'succeeded' },
              errors: [],
              __typename: 'CreateBookingWithPaymentPayload',
            },
          },
        },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/booking/1']}>
          <Routes>
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByText('Payment')).toBeInTheDocument()

    const submit = screen.getByRole('button', { name: /book/i })
    fireEvent.click(submit)

    await waitFor(() => {
      const addToast = getMockAddToast()
      const calls = addToast.mock.calls.map((c) => c[0])
      expect(calls.some((c) => c?.type === 'success' && /Booking confirmed/i.test(c?.message || ''))).toBe(true)
    })
  })

  it('can book with bundle credits when the session is bundle-enabled and credits exist', async () => {
    const session = {
      __typename: 'ClassSession',
      id: '1',
      startTime: new Date('2026-03-02T10:30:00.000Z').toISOString(),
      endTime: new Date('2026-03-02T11:20:00.000Z').toISOString(),
      room: 'Room A',
      capacity: 10,
      seatsAvailable: 8,
      bundleEnabled: true,
      bundleSpots: 4,
      bundleSpotsTaken: 1,
      bundleSpotsAvailable: 3,
      classTemplate: {
        __typename: 'ClassTemplate',
        id: 'tmpl-1',
        title: 'Morning Mat Reset',
        priceCents: 2400,
        currency: 'cad',
        durationMinutes: 50,
      },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex Chen' },
    }

    const mocks = [
      paymentPublicSettingsMock({ stripePublishableKey: 'pk_test_123', configured: true }),
      myClientMock(null),
      {
        request: { query: CLASS_SESSIONS, variables: { from: null, to: null } },
        result: { data: { classSessions: [session] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [] } },
      },
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [] } },
      },
      {
        request: { query: BUNDLE_PRODUCTS_FOR_CLASS_SESSION, variables: { classSessionId: '1' } },
        result: {
          data: {
            bundleProductsForClassSession: [
              {
                __typename: 'BundleProduct',
                id: 'bundle-prod-1',
                title: '10 pack',
                creditsCount: 10,
                priceCents: 10000,
                currency: 'cad',
                classTemplate: { __typename: 'ClassTemplate', id: 'tmpl-1', title: 'Morning Mat Reset' },
                instructor: { __typename: 'User', id: 'inst-1', name: 'Alex Chen' },
              },
            ],
          },
        },
      },
      {
        request: { query: MY_BUNDLE_PURCHASES, variables: {} },
        result: {
          data: {
            myBundlePurchases: [
              {
                __typename: 'BundlePurchase',
                id: 'bundle-purchase-1',
                status: 'succeeded',
                creditsTotal: 10,
                creditsRemaining: 7,
                priceCents: 10000,
                currency: 'cad',
                createdAt: new Date().toISOString(),
                bundleProduct: {
                  __typename: 'BundleProduct',
                  id: 'bundle-prod-1',
                  title: '10 pack',
                  description: null,
                  creditsCount: 10,
                  currency: 'cad',
                },
              },
            ],
          },
        },
      },
      {
        request: {
          query: CREATE_BOOKING_WITH_BUNDLE,
          variables: { clientId: null, classSessionId: '1', bundlePurchaseId: 'bundle-purchase-1' },
        },
        result: {
          data: {
            createBookingWithBundle: {
              booking: { __typename: 'Booking', id: 'booking-bundle-1', status: 'booked' },
              payment: null,
              bundlePurchase: { __typename: 'BundlePurchase', id: 'bundle-purchase-1', creditsRemaining: 6 },
              errors: [],
              __typename: 'CreateBookingWithBundlePayload',
            },
          },
        },
      },
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/booking/1']}>
          <Routes>
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByText('Payment')).toBeInTheDocument()
    expect(await screen.findByText('Bundle credits')).toBeInTheDocument()

    // Should auto-select bundle when eligible credits exist.
    const submit = screen.getByRole('button', { name: /bundle credits/i })
    fireEvent.click(submit)

    await waitFor(() => {
      const addToast = getMockAddToast()
      const calls = addToast.mock.calls.map((c) => c[0])
      expect(calls.some((c) => c?.type === 'success' && /Booking confirmed/i.test(c?.message || ''))).toBe(true)
    })
  })
})
