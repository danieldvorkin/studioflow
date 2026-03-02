import React from 'react'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { ownerUser } from '../helpers/users'
import { studioSettingsMock, classTemplatesMock, instructorsMock } from '../helpers/apolloMocks'

let App

beforeAll(async () => {
  App = (await import('../../App.jsx')).default
})

beforeEach(() => {
  setMockAuth({ user: ownerUser() })
})

describe('Owner role navigation', () => {
  it('shows Owner section links in sidebar', async () => {
    window.history.pushState({}, 'Test', '/templates')

    const mocks = [
      studioSettingsMock(),
      classTemplatesMock({ templates: [], studioLocationId: null }),
      instructorsMock([]),
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    await screen.findByRole('heading', { name: 'Classes' })

    expect(screen.getByRole('link', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Instructor payouts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Locations' })).toBeInTheDocument()
  })
})
