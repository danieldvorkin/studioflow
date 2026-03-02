import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { setMockAuth } from '../mocks/baseMocks'
import { clientUser } from '../helpers/users'

import Sessions from '../../pages/Sessions.jsx'
import Favorites from '../../pages/Favorites.jsx'
import { CLASS_SESSIONS, CLASS_TEMPLATES, MY_BOOKINGS, MY_FAVORITE_CLASS_SESSIONS, STUDIO_LOCATIONS } from '../../apollo/queries'
import { TOGGLE_FAVORITE_CLASS_SESSION } from '../../apollo/mutations'

vi.mock('../../studio/StudioProvider', () => ({
  useStudio: () => ({
    studios: [{ id: 'studio-1', name: 'Studio One' }],
    selectedStudioId: 'studio-1',
    setSelectedStudioId: vi.fn(),
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}))

describe('Client favorites', () => {
  beforeEach(() => {
    setMockAuth({ user: clientUser({ id: 'u-1', name: 'Client User', email: 'client@example.com' }) })
  })

  it('can favorite a session and see it in Favorites', async () => {
    const session = {
      __typename: 'ClassSession',
      id: 'sess-1',
      startTime: new Date('2026-03-01T14:30:00Z').toISOString(),
      endTime: null,
      capacity: 10,
      room: 'A',
      seatsAvailable: 5,
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex' },
      classTemplate: { __typename: 'ClassTemplate', id: 'tmpl-1', title: 'Reformer', priceCents: 2500, currency: 'cad', durationMinutes: 50 },
    }

    const template = {
      __typename: 'ClassTemplate',
      id: 'tmpl-1',
      title: 'Reformer',
      description: 'Strong + steady.',
      capacity: 10,
      durationMinutes: 50,
      priceCents: 2500,
      currency: 'cad',
      compensationType: null,
      instructorSplitPercent: null,
      instructorFlatRateCents: null,
      studioLocation: { __typename: 'StudioLocation', id: 'loc-1', name: 'Main' },
      instructor: { __typename: 'User', id: 'inst-1', name: 'Alex', email: 'alex@example.com' },
    }

    const favoritesEmptyMock = {
      request: { query: MY_FAVORITE_CLASS_SESSIONS, variables: { studioId: 'studio-1' } },
      result: { data: { myFavoriteClassSessions: [] } },
    }

    const sessionsMock = {
      request: { query: CLASS_SESSIONS, variables: { from: null, to: null, studioId: 'studio-1' } },
      result: { data: { classSessions: [session] } },
    }

    const templatesMock = {
      request: { query: CLASS_TEMPLATES, variables: { studioId: 'studio-1' } },
      result: { data: { classTemplates: [template] } },
    }

    const myBookingsMock = {
      request: { query: MY_BOOKINGS, variables: { studioId: 'studio-1' } },
      result: { data: { myBookings: [] } },
    }

    const toggleMock = {
      request: { query: TOGGLE_FAVORITE_CLASS_SESSION, variables: { classSessionId: 'sess-1' } },
      result: { data: { toggleFavoriteClassSession: { __typename: 'ToggleFavoriteClassSessionPayload', favorited: true, classSession: { __typename: 'ClassSession', id: 'sess-1' }, errors: [] } } },
    }

    const favoritesAfterMock = {
      request: { query: MY_FAVORITE_CLASS_SESSIONS, variables: { studioId: 'studio-1' } },
      result: { data: { myFavoriteClassSessions: [session] } },
    }

    const favoritesAfterMock2 = {
      request: { query: MY_FAVORITE_CLASS_SESSIONS, variables: { studioId: 'studio-1' } },
      result: { data: { myFavoriteClassSessions: [session] } },
    }

    const studioLocationsMock = {
      request: { query: STUDIO_LOCATIONS, variables: { studioId: 'studio-1' } },
      result: { data: { studioLocations: [{ __typename: 'StudioLocation', id: 'loc-1', name: 'Main', address: null, city: null, state: null, zip: null }] } },
    }

    const favoritesPageMock = {
      request: { query: MY_FAVORITE_CLASS_SESSIONS, variables: { studioId: 'studio-1' } },
      result: { data: { myFavoriteClassSessions: [session] } },
    }

    const sessionFlowMocks = [
      favoritesEmptyMock,
      sessionsMock,
      templatesMock,
      myBookingsMock,
      toggleMock,
      favoritesAfterMock,
      favoritesAfterMock2,
    ]

    const favoritesPageMocks = [
      studioLocationsMock,
      favoritesPageMock,
    ]

    const { unmount } = render(
      <MockedProvider mocks={sessionFlowMocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/templates/tmpl-1/sessions']}>
          <Routes>
            <Route path="/templates/:id/sessions" element={<Sessions />} />
            <Route path="/favorites" element={<Favorites />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    const saveBtn = await screen.findByRole('button', { name: 'Favorite session' })
    fireEvent.click(saveBtn)

    expect(await screen.findByText('♥ Saved')).toBeInTheDocument()

    unmount()

    // Navigate to Favorites to see the saved session listed.
    render(
      <MockedProvider mocks={favoritesPageMocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/favorites']}>
          <Routes>
            <Route path="/favorites" element={<Favorites />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByText('Reformer')).toBeInTheDocument()
  })
})
