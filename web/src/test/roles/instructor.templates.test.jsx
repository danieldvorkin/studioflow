import React from 'react'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'

import { setMockAuth } from '../mocks/baseMocks'
import { instructorUser } from '../helpers/users'
import { studioSettingsMock, classTemplatesMock } from '../helpers/apolloMocks'

let App

beforeAll(async () => {
  App = (await import('../../App.jsx')).default
})

beforeEach(() => {
  setMockAuth({ user: instructorUser({ id: 'inst-1', name: 'Ingrid Instructor', email: 'ingrid@example.com' }) })
})

describe('Instructor Templates workflows', () => {
  it('does not show the Unassigned instructor option', async () => {
    window.history.pushState({}, 'Test', '/templates')

    const mocks = [
      studioSettingsMock(),
      classTemplatesMock({ templates: [], studioLocationId: null }),
    ]

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    )

    await screen.findByRole('heading', { name: 'Classes' })

    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
    expect(screen.getAllByText('Ingrid Instructor').length).toBeGreaterThan(0)
  })
})
