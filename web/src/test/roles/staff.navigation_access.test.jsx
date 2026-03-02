import React from 'react'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { staffUser } from '../helpers/users'
import {
  studioSettingsMock,
  classTemplatesMock,
  instructorsMock,
  currentUserMock,
  ownerDashboardDataMocks,
  studioLocationsMock,
} from '../helpers/apolloMocks'

let App

beforeAll(async () => {
  App = (await import('../../App.jsx')).default
})

beforeEach(() => {
  setMockAuth({ user: staffUser() })
})

describe('Staff role navigation + access guards', () => {
  it('does not show Owner section links in sidebar', async () => {
    window.history.pushState({}, 'Test', '/templates')

    const staff = staffUser()
    const mocks = [
      studioSettingsMock(),
      classTemplatesMock({ templates: [], studioLocationId: null }),
      instructorsMock([]),
      // Some pages/components may still ask CURRENT_USER; keep it consistent.
      currentUserMock(staff),
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    await screen.findByRole('heading', { name: 'Classes' })

    expect(screen.queryByRole('link', { name: 'Owner' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Instructor payouts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Locations' })).not.toBeInTheDocument()
  })

  it('blocks direct access to /owner, /owner/instructor-payouts, and /locations', async () => {
    const staff = staffUser()

    const baseMocks = [
      studioSettingsMock(),
      currentUserMock(staff),
    ]

    // /owner
    window.history.pushState({}, 'Test', '/owner')
    render(
      <MockedProvider
        mocks={[...baseMocks, ...ownerDashboardDataMocks()]}
        cache={new InMemoryCache()}
      >
        <App />
      </MockedProvider>,
    )

    expect((await screen.findAllByRole('heading', { name: /owner access only/i })).length).toBeGreaterThan(0)

    cleanup()

    // /owner/instructor-payouts
    window.history.pushState({}, 'Test', '/owner/instructor-payouts')
    render(
      <MockedProvider mocks={baseMocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    expect((await screen.findAllByRole('heading', { name: /owner access only/i })).length).toBeGreaterThan(0)

    cleanup()

    // /locations
    window.history.pushState({}, 'Test', '/locations')
    render(
      <MockedProvider
        mocks={[...baseMocks, studioLocationsMock([])]}
        cache={new InMemoryCache()}
      >
        <App />
      </MockedProvider>,
    )

    expect((await screen.findAllByRole('heading', { name: /owner access only/i })).length).toBeGreaterThan(0)
  })
})
