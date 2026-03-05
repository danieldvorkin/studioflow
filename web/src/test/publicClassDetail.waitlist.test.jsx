import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: null }),
  AuthProvider: ({ children }) => children,
}))

import PublicClassDetail from '../pages/PublicClassDetail.jsx'
import { PUBLIC_CLASS_PAGE } from '../apollo/queries.js'

const BASE_SESSION = {
  __typename: 'ClassSession',
  id: 'sess-1',
  startTime: new Date(Date.now() + 86400000).toISOString(),
  endTime: null,
  capacity: 10,
  room: 'Studio A',
  seatsAvailable: 5,
  instructor: { __typename: 'User', id: 'u-1', name: 'Alex Smith', avatarUrl: null },
}

const FULL_SESSION = {
  ...BASE_SESSION,
  id: 'sess-2',
  seatsAvailable: 0,
  instructor: { __typename: 'User', id: 'u-1', name: 'Alex Smith', avatarUrl: null },
}

const BASE_MOCK = {
  request: {
    query: PUBLIC_CLASS_PAGE,
    variables: { studioInviteCode: 'ABC123', templateId: 'tmpl-1' },
  },
  result: {
    data: {
      publicClassPage: {
        __typename: 'PublicClassPage',
        studioName: 'Test Studio',
        studioInviteCode: 'ABC123',
        template: {
          __typename: 'ClassTemplate',
          id: 'tmpl-1',
          title: 'Reformer Pilates',
          description: 'A great class',
          capacity: 10,
          durationMinutes: 50,
          priceCents: 3500,
          currency: 'CAD',
          instructor: {
            __typename: 'User',
            id: 'u-1',
            name: 'Alex Smith',
            avatarUrl: null,
          },
          studioLocation: {
            __typename: 'StudioLocation',
            id: 'loc-1',
            name: 'Main Studio',
          },
        },
        upcomingSessions: [BASE_SESSION],
      },
    },
  },
}

describe('PublicClassDetail – available session', () => {
  it('shows "Book now" CTA for a session with spots', async () => {
    render(
      <MockedProvider mocks={[BASE_MOCK]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/c/ABC123/tmpl-1']}>
          <Routes>
            <Route path="/c/:studioCode/:templateId" element={<PublicClassDetail />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByText(/Reformer Pilates/i)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Sign up & book/i })).toBeInTheDocument()
  })
})

describe('PublicClassDetail – sold-out session', () => {
  it('shows "Join waitlist" CTA and waitlist badge when session is full', async () => {
    const mock = {
      ...BASE_MOCK,
      result: {
        data: {
          publicClassPage: {
            ...BASE_MOCK.result.data.publicClassPage,
            upcomingSessions: [FULL_SESSION],
          },
        },
      },
    }

    render(
      <MockedProvider mocks={[mock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/c/ABC123/tmpl-1']}>
          <Routes>
            <Route path="/c/:studioCode/:templateId" element={<PublicClassDetail />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    expect(await screen.findByRole('link', { name: /Join waitlist/i })).toBeInTheDocument()
    expect(screen.getByText(/Waitlist open/i)).toBeInTheDocument()
  })

  it('does not render "Sold out" text for a full session', async () => {
    const mock = {
      ...BASE_MOCK,
      result: {
        data: {
          publicClassPage: {
            ...BASE_MOCK.result.data.publicClassPage,
            upcomingSessions: [FULL_SESSION],
          },
        },
      },
    }

    render(
      <MockedProvider mocks={[mock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/c/ABC123/tmpl-1']}>
          <Routes>
            <Route path="/c/:studioCode/:templateId" element={<PublicClassDetail />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    await screen.findByRole('link', { name: /Join waitlist/i })
    expect(screen.queryByText(/Sold out/i)).not.toBeInTheDocument()
  })
})

describe('PublicClassDetail – instructor avatar', () => {
  it('renders instructor initials when avatarUrl is null', async () => {
    render(
      <MockedProvider mocks={[BASE_MOCK]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/c/ABC123/tmpl-1']}>
          <Routes>
            <Route path="/c/:studioCode/:templateId" element={<PublicClassDetail />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    // initials for "Alex Smith" are "AS"
    expect(await screen.findAllByText('AS')).not.toHaveLength(0)
  })

  it('renders instructor avatar img when avatarUrl is provided', async () => {
    const mockWithAvatar = {
      ...BASE_MOCK,
      result: {
        data: {
          publicClassPage: {
            ...BASE_MOCK.result.data.publicClassPage,
            template: {
              ...BASE_MOCK.result.data.publicClassPage.template,
              instructor: {
                __typename: 'User',
                id: 'u-1',
                name: 'Alex Smith',
                avatarUrl: 'https://example.com/avatar.jpg',
              },
            },
            upcomingSessions: [
              {
                ...BASE_SESSION,
                instructor: {
                  __typename: 'User',
                  id: 'u-1',
                  name: 'Alex Smith',
                  avatarUrl: 'https://example.com/avatar.jpg',
                },
              },
            ],
          },
        },
      },
    }

    render(
      <MockedProvider mocks={[mockWithAvatar]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={['/c/ABC123/tmpl-1']}>
          <Routes>
            <Route path="/c/:studioCode/:templateId" element={<PublicClassDetail />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )

    await screen.findAllByText(/Reformer Pilates/i)
    const avatarImgs = screen.getAllByRole('img', { name: /Alex Smith/i })
    expect(avatarImgs.length).toBeGreaterThan(0)
    expect(avatarImgs[0]).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })
})
