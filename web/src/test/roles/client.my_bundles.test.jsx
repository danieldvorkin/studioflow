import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { MemoryRouter } from 'react-router-dom'

// ─── Module mocks (must precede the page import) ──────────────────────────────
vi.mock('@stripe/react-stripe-js', () => ({
  Elements:    ({ children }) => children,
  CardElement: () => null,
  useStripe:   () => null,
  useElements: () => null,
}))
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => null }))

vi.mock('../../components/ToastProvider', () => ({
  useToast:    () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
}))

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn(), applyTheme: vi.fn(), clearThemeOverride: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id:       'u-client',
      email:    'client@example.com',
      name:     'Client User',
      role:     3,
      roleName: 'client',
      godmode:  false,
      active:   true,
    },
    loading: false,
    signOut: vi.fn(),
    isImpersonating: false,
  }),
  AuthProvider: ({ children }) => children,
}))

vi.mock('../../studio/StudioProvider', () => ({
  useStudio: () => ({
    selectedStudioId:    'studio-1',
    setSelectedStudioId: vi.fn(),
    studios: [{ id: 'studio-1', name: 'Pilates Studio' }],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}))

// ─── Page import ──────────────────────────────────────────────────────────────
import MyBundlesPage from '../../pages/MyBundles.jsx'
import {
  BUNDLE_SHOP_PRODUCTS,
  MY_BUNDLE_PURCHASES,
  MY_CLIENT,
  PAYMENT_PUBLIC_SETTINGS,
} from '../../apollo/queries.js'

// ─── Shared mock data ─────────────────────────────────────────────────────────
const STUDIO_ID = 'studio-1'

const paymentSettingsUnconfiguredMock = {
  request: { query: PAYMENT_PUBLIC_SETTINGS, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      paymentPublicSettings: {
        __typename:          'PaymentPublicSetting',
        stripePublishableKey: null,
        defaultCurrency:     'cad',
        enabled:             false,
        configured:          false,
      },
    },
  },
}

const paymentSettingsConfiguredMock = {
  request: { query: PAYMENT_PUBLIC_SETTINGS, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      paymentPublicSettings: {
        __typename:          'PaymentPublicSetting',
        stripePublishableKey: 'pk_test_demo',
        defaultCurrency:     'cad',
        enabled:             true,
        configured:          true,
      },
    },
  },
}

const myClientMock = {
  request: { query: MY_CLIENT, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      myClient: {
        __typename:                        'Client',
        id:                                'c-1',
        name:                              'Client User',
        email:                             'client@example.com',
        stripeCustomerId:                  null,
        stripeDefaultPaymentMethodId:      null,
        stripeDefaultPaymentMethodBrand:   null,
        stripeDefaultPaymentMethodLast4:   null,
        stripeDefaultPaymentMethodExpMonth: null,
        stripeDefaultPaymentMethodExpYear:  null,
        clientPaymentMethods:              [],
      },
    },
  },
}

const emptyPurchasesMock = {
  request: { query: MY_BUNDLE_PURCHASES, variables: { studioId: STUDIO_ID } },
  result:  { data: { myBundlePurchases: [] } },
}

const emptyShopMock = {
  request: { query: BUNDLE_SHOP_PRODUCTS, variables: { studioId: STUDIO_ID } },
  result:  { data: { bundleShopProducts: [] } },
}

const purchaseWithCreditsMock = {
  request: { query: MY_BUNDLE_PURCHASES, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      myBundlePurchases: [
        {
          __typename:      'BundlePurchase',
          id:              'bp-1',
          status:          'succeeded',
          creditsTotal:    10,
          creditsRemaining: 7,
          priceCents:      30_000,
          currency:        'cad',
          createdAt:       new Date('2026-03-01T00:00:00Z').toISOString(),
          bundleProduct: {
            __typename:    'BundleProduct',
            id:            'prod-1',
            title:         '10-Class Pack',
            description:   'Use for any Reformer class',
            creditsCount:  10,
            currency:      'cad',
            instructor:    null,
            classTemplate: null,
          },
        },
      ],
    },
  },
}

const shopProductsMock = {
  request: { query: BUNDLE_SHOP_PRODUCTS, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      bundleShopProducts: [
        {
          __typename:    'BundleProduct',
          id:            'prod-2',
          title:         '5-Class Pack',
          description:   'Five Reformer classes',
          active:        true,
          creditsCount:  5,
          priceCents:    15_000,
          currency:      'cad',
          classTemplate: { __typename: 'ClassTemplate', id: 't-1', title: 'Reformer' },
          instructor:    null,
        },
      ],
    },
  },
}

function renderBundles(mocks) {
  return render(
    <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={['/my-bundles']}>
        <MyBundlesPage />
      </MemoryRouter>
    </MockedProvider>,
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Client – My Bundles page', () => {
  it('renders the Bundles heading', async () => {
    renderBundles([paymentSettingsUnconfiguredMock, myClientMock, emptyPurchasesMock, emptyShopMock])
    expect(await screen.findByRole('heading', { name: /Bundles/i })).toBeInTheDocument()
  })

  it('shows "No active bundles yet" when client has no purchases', async () => {
    renderBundles([paymentSettingsUnconfiguredMock, myClientMock, emptyPurchasesMock, emptyShopMock])
    expect(await screen.findByText(/No active bundles yet/i)).toBeInTheDocument()
  })

  it('shows existing bundle purchase credits', async () => {
    renderBundles([paymentSettingsUnconfiguredMock, myClientMock, purchaseWithCreditsMock, emptyShopMock])
    expect(await screen.findByText(/10-Class Pack/i)).toBeInTheDocument()
    expect(await screen.findByText(/7 \/ 10 credits remaining/i)).toBeInTheDocument()
  })

  it('shows shop products available to purchase', async () => {
    renderBundles([paymentSettingsConfiguredMock, myClientMock, emptyPurchasesMock, shopProductsMock])
    expect(await screen.findByText(/5-Class Pack/i)).toBeInTheDocument()
  })

  it('shows a payments-not-configured warning when Stripe is not set up', async () => {
    renderBundles([paymentSettingsUnconfiguredMock, myClientMock, emptyPurchasesMock, emptyShopMock])
    // The page renders a curly-apostrophe in "aren't"
    expect(await screen.findByText(/Payments are/i)).toBeInTheDocument()
  })
})
