import { gql } from '@apollo/client'

export const CREATE_CLIENT = gql`
  mutation CreateClient {
    createClient(input: {}) {
      client { id name email phone }
      errors
    }
  }
`

export const CREATE_BOOKING = gql`
  mutation CreateBooking($clientId: ID, $classSessionId: ID!) {
    createBooking(input: { clientId: $clientId, classSessionId: $classSessionId }) {
      booking {
        id
        status
        classSession { id startTime }
      }
      errors
    }
  }
`

export const SIGN_IN_WITH_GOOGLE = gql`
  mutation SignInWithGoogle($accessToken: String!) {
    signInWithGoogle(input: { accessToken: $accessToken }) {
      token
      user { id email name role roleName active availableForSessions }
      errors
    }
  }
`

export const START_IMPERSONATION = gql`
  mutation StartImpersonation($userId: ID!) {
    startImpersonation(input: { userId: $userId }) {
      token
      user { id email name role roleName active availableForSessions }
      errors
    }
  }
`

export const CREATE_STUDIO_LOCATION = gql`
  mutation CreateStudioLocation($name: String!, $address: String, $city: String, $state: String, $zip: String) {
    createStudioLocation(input: { name: $name, address: $address, city: $city, state: $state, zip: $zip }) {
      studioLocation { id name address city state zip }
      errors
    }
  }
`

export const UPDATE_STUDIO_LOCATION = gql`
  mutation UpdateStudioLocation($id: ID!, $name: String, $address: String, $city: String, $state: String, $zip: String) {
    updateStudioLocation(input: { id: $id, name: $name, address: $address, city: $city, state: $state, zip: $zip }) {
      studioLocation { id name address city state zip }
      errors
    }
  }
`

export const DELETE_STUDIO_LOCATION = gql`
  mutation DeleteStudioLocation($id: ID!) {
    deleteStudioLocation(input: { id: $id }) {
      success
      errors
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $id: ID!
    $name: String
    $email: String
    $role: Int
    $active: Boolean
    $availableForSessions: Boolean
    $instructorCompensationType: String
    $instructorDefaultSplitPercent: Int
    $instructorDefaultFlatRateCents: Int
    $stripeConnectAccountId: String
  ) {
    updateUser(input: {
      id: $id
      name: $name
      email: $email
      role: $role
      active: $active
      availableForSessions: $availableForSessions
      instructorCompensationType: $instructorCompensationType
      instructorDefaultSplitPercent: $instructorDefaultSplitPercent
      instructorDefaultFlatRateCents: $instructorDefaultFlatRateCents
      stripeConnectAccountId: $stripeConnectAccountId
    }) {
      user {
        id
        email
        name
        role
        roleName
        active
        availableForSessions
        instructorCompensationType
        instructorDefaultSplitPercent
        instructorDefaultFlatRateCents
        stripeConnectAccountId
        stripeConnectOnboardingCompleted
      }
      errors
    }
  }
`

export const INVITE_USER = gql`
  mutation InviteUser($email: String!, $name: String, $role: Int!) {
    inviteUser(input: { email: $email, name: $name, role: $role }) {
      user { id email name role roleName active availableForSessions }
      errors
    }
  }
`

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $name: String
    $email: String
    $password: String
    $passwordConfirmation: String
    $currentPassword: String
  ) {
    updateProfile(input: {
      name: $name
      email: $email
      password: $password
      passwordConfirmation: $passwordConfirmation
      currentPassword: $currentPassword
    }) {
      user { id email name role roleName active availableForSessions }
      errors
    }
  }
`

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($id: ID!) {
    cancelBooking(input: { id: $id }) {
      success
      errors
    }
  }
`

export const ARCHIVE_BOOKING = gql`
  mutation ArchiveBooking($id: ID!) {
    archiveBooking(input: { id: $id }) {
      success
      errors
    }
  }
`

export const REBOOK_BOOKING = gql`
  mutation RebookBooking($id: ID!) {
    rebookBooking(input: { id: $id }) {
      booking {
        id
        status
        archived
      }
      errors
    }
  }
`

export const REBOOK_BOOKING_WITH_PAYMENT = gql`
  mutation RebookBookingWithPayment($id: ID!, $paymentMethodId: String) {
    rebookBookingWithPayment(input: { id: $id, paymentMethodId: $paymentMethodId }) {
      booking {
        id
        status
        archived
        paid
      }
      payment {
        id
        amountCents
        currency
        status
      }
      errors
    }
  }
`

export const TOGGLE_FAVORITE_CLASS_SESSION = gql`
  mutation ToggleFavoriteClassSession($classSessionId: ID!) {
    toggleFavoriteClassSession(input: { classSessionId: $classSessionId }) {
      favorited
      classSession { id }
      errors
    }
  }
`

export const CREATE_BOOKING_CHECKOUT_SESSION = gql`
  mutation CreateBookingCheckoutSession($bookingId: ID!) {
    createBookingCheckoutSession(input: { bookingId: $bookingId }) {
      checkoutUrl
      checkoutSessionId
      errors
    }
  }
`

export const CONFIRM_BOOKING_CHECKOUT_PAYMENT = gql`
  mutation ConfirmBookingCheckoutPayment($bookingId: ID!, $checkoutSessionId: String!) {
    confirmBookingCheckoutPayment(input: { bookingId: $bookingId, checkoutSessionId: $checkoutSessionId }) {
      booking { id paid payment { id status amountCents currency } }
      payment { id status amountCents currency }
      errors
    }
  }
`

export const SEND_BOOKING_PAYMENT_REMINDER = gql`
  mutation SendBookingPaymentReminder($bookingId: ID!) {
    sendBookingPaymentReminder(input: { bookingId: $bookingId }) {
      success
      checkoutUrl
      errors
    }
  }
`

export const CREATE_CLASS_SESSION = gql`
  mutation CreateClassSession(
    $classTemplateId: ID!
    $startTime: ISO8601DateTime!
    $endTime: ISO8601DateTime
    $capacity: Int
    $room: String
    $bundleEnabled: Boolean
    $bundleSpots: Int
  ) {
    createClassSession(input: {
      classTemplateId: $classTemplateId
      startTime: $startTime
      endTime: $endTime
      capacity: $capacity
      room: $room
      bundleEnabled: $bundleEnabled
      bundleSpots: $bundleSpots
    }) {
      classSession {
        id
        startTime
        endTime
        capacity
        room
        bundleEnabled
        bundleSpots
        bundleSpotsTaken
        bundleSpotsAvailable
        classTemplate { id title }
        instructor { id name }
      }
      errors
    }
  }
`

export const CREATE_CLASS_TEMPLATE = gql`
  mutation CreateClassTemplate(
    $title: String!
    $description: String
    $capacity: Int
    $durationMinutes: Int
    $priceCents: Int
    $studioLocationId: ID
    $instructorId: ID
    $currency: String
  ) {
    createClassTemplate(
      input: {
        title: $title
        description: $description
        capacity: $capacity
        durationMinutes: $durationMinutes
        priceCents: $priceCents
        studioLocationId: $studioLocationId
        instructorId: $instructorId
        currency: $currency
      }
    ) {
      classTemplate {
        id
        title
        description
        capacity
        durationMinutes
        priceCents
        currency
        studioLocation { id name }
        instructor { id name email }
      }
      errors
    }
  }
`

export const UPDATE_CLASS_TEMPLATE = gql`
  mutation UpdateClassTemplate(
    $id: ID!
    $title: String
    $description: String
    $capacity: Int
    $durationMinutes: Int
    $priceCents: Int
    $instructorId: ID
    $currency: String
    $compensationType: String
    $instructorSplitPercent: Int
    $instructorFlatRateCents: Int
  ) {
    updateClassTemplate(
      input: {
        id: $id
        title: $title
        description: $description
        capacity: $capacity
        durationMinutes: $durationMinutes
        priceCents: $priceCents
        instructorId: $instructorId
        currency: $currency
        compensationType: $compensationType
        instructorSplitPercent: $instructorSplitPercent
        instructorFlatRateCents: $instructorFlatRateCents
      }
    ) {
      classTemplate {
        id
        title
        description
        capacity
        durationMinutes
        priceCents
        currency
        compensationType
        instructorSplitPercent
        instructorFlatRateCents
        instructor { id name email }
      }
      errors
    }
  }
`

export const CREATE_INSTRUCTOR_PAYOUT = gql`
  mutation CreateInstructorPayout($instructorId: ID!, $weekStart: ISO8601Date!, $weekEnd: ISO8601Date, $currency: String!) {
    createInstructorPayout(input: { instructorId: $instructorId, weekStart: $weekStart, weekEnd: $weekEnd, currency: $currency }) {
      payout {
        id
        status
        weekStart
        weekEnd
        currency
        grossCents
        instructorEarningsCents
        studioCutCents
        paidAt
        stripeTransferId
      }
      errors
    }
  }
`

export const PAY_INSTRUCTOR_PAYOUT = gql`
  mutation PayInstructorPayout($id: ID!) {
    payInstructorPayout(input: { id: $id }) {
      payout {
        id
        status
        paidAt
        stripeTransferId
        paidMethod
        paidReference
      }
      errors
    }
  }
`

export const MARK_INSTRUCTOR_PAYOUT_PAID = gql`
  mutation MarkInstructorPayoutPaid($id: ID!, $paidMethod: String!, $paidReference: String, $paidNotes: String) {
    markInstructorPayoutPaid(input: { id: $id, paidMethod: $paidMethod, paidReference: $paidReference, paidNotes: $paidNotes }) {
      payout {
        id
        status
        paidAt
        stripeTransferId
        paidMethod
        paidReference
      }
      errors
    }
  }
`

export const CREATE_INSTRUCTOR_CONNECT_ONBOARDING = gql`
  mutation CreateInstructorConnectOnboarding($instructorId: ID!) {
    createInstructorConnectOnboarding(input: { instructorId: $instructorId }) {
      instructor {
        id
        stripeConnectAccountId
        stripeConnectOnboardingCompleted
      }
      onboardingUrl
      errors
    }
  }
`

export const REFRESH_INSTRUCTOR_CONNECT_STATUS = gql`
  mutation RefreshInstructorConnectStatus($instructorId: ID!) {
    refreshInstructorConnectStatus(input: { instructorId: $instructorId }) {
      instructor {
        id
        stripeConnectAccountId
        stripeConnectOnboardingCompleted
      }
      errors
    }
  }
`

export const DELETE_CLASS_TEMPLATE = gql`
  mutation DeleteClassTemplate($id: ID!) {
    deleteClassTemplate(input: { id: $id }) {
      success
      errors
    }
  }
`

export const UPDATE_CLASS_SESSION = gql`
  mutation UpdateClassSession(
    $id: ID!
    $startTime: ISO8601DateTime
    $endTime: ISO8601DateTime
    $capacity: Int
    $room: String
    $bundleEnabled: Boolean
    $bundleSpots: Int
  ) {
    updateClassSession(input: {
      id: $id
      startTime: $startTime
      endTime: $endTime
      capacity: $capacity
      room: $room
      bundleEnabled: $bundleEnabled
      bundleSpots: $bundleSpots
    }) {
      classSession {
        id
        startTime
        endTime
        capacity
        room
        bundleEnabled
        bundleSpots
        bundleSpotsTaken
        bundleSpotsAvailable
      }
      errors
    }
  }
`

export const CREATE_BUNDLE_PRODUCT = gql`
  mutation CreateBundleProduct(
    $title: String!
    $description: String
    $active: Boolean
    $creditsCount: Int!
    $priceCents: Int!
    $currency: String!
    $classTemplateId: ID
    $instructorId: ID
  ) {
    createBundleProduct(input: {
      title: $title
      description: $description
      active: $active
      creditsCount: $creditsCount
      priceCents: $priceCents
      currency: $currency
      classTemplateId: $classTemplateId
      instructorId: $instructorId
    }) {
      bundleProduct {
        id
        title
        description
        active
        creditsCount
        priceCents
        currency
        classTemplate { id title }
        instructor { id name email }
      }
      errors
    }
  }
`

export const UPDATE_BUNDLE_PRODUCT = gql`
  mutation UpdateBundleProduct(
    $id: ID!
    $title: String
    $description: String
    $active: Boolean
    $creditsCount: Int
    $priceCents: Int
    $currency: String
    $classTemplateId: ID
    $instructorId: ID
  ) {
    updateBundleProduct(input: {
      id: $id
      title: $title
      description: $description
      active: $active
      creditsCount: $creditsCount
      priceCents: $priceCents
      currency: $currency
      classTemplateId: $classTemplateId
      instructorId: $instructorId
    }) {
      bundleProduct {
        id
        title
        description
        active
        creditsCount
        priceCents
        currency
        classTemplate { id title }
        instructor { id name email }
      }
      errors
    }
  }
`

export const DELETE_BUNDLE_PRODUCT = gql`
  mutation DeleteBundleProduct($id: ID!) {
    deleteBundleProduct(input: { id: $id }) {
      success
      errors
    }
  }
`

export const DELETE_CLASS_SESSION = gql`
  mutation DeleteClassSession($id: ID!) {
    deleteClassSession(input: { id: $id }) {
      success
      errors
    }
  }
`

export const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: ID!, $name: String, $email: String, $phone: String, $characteristicScores: JSON) {
    updateClient(input: { id: $id, name: $name, email: $email, phone: $phone, characteristicScores: $characteristicScores }) {
      client { id name email phone characteristicScores }
      errors
    }
  }
`

export const CREATE_CLIENT_NOTE = gql`
  mutation CreateClientNote($clientId: ID!, $body: String!) {
    createClientNote(input: { clientId: $clientId, body: $body }) {
      note {
        id
        body
        createdAt
        author { id name email }
      }
      errors
    }
  }
`

export const TOGGLE_CLIENT_BLOCK = gql`
  mutation ToggleClientBlock($clientId: ID!, $blocked: Boolean!) {
    toggleClientBlock(clientId: $clientId, blocked: $blocked) {
      client { id name email phone blockedByCurrentInstructor }
      blocked
      errors
    }
  }
`

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(input: { id: $id }) {
      success
      errors
    }
  }
`

export const CREATE_BOOKING_WITH_PAYMENT = gql`
  mutation CreateBookingWithPayment($clientId: ID, $classSessionId: ID!, $paymentMethodId: String) {
    createBookingWithPayment(
      input: { clientId: $clientId, classSessionId: $classSessionId, paymentMethodId: $paymentMethodId }
    ) {
      booking {
        id
        status
      }
      payment {
        id
        amountCents
        currency
        status
      }
      errors
    }
  }
`

export const PURCHASE_BUNDLE_PRODUCT = gql`
  mutation PurchaseBundleProduct($bundleProductId: ID!, $clientId: ID, $paymentMethodId: String) {
    purchaseBundleProduct(
      input: { bundleProductId: $bundleProductId, clientId: $clientId, paymentMethodId: $paymentMethodId }
    ) {
      bundlePurchase {
        id
        status
        creditsTotal
        creditsRemaining
        priceCents
        currency
        createdAt
        bundleProduct { id title creditsCount currency }
      }
      errors
    }
  }
`

export const CREATE_BOOKING_WITH_BUNDLE = gql`
  mutation CreateBookingWithBundle($clientId: ID, $classSessionId: ID!, $bundlePurchaseId: ID!) {
    createBookingWithBundle(
      input: { clientId: $clientId, classSessionId: $classSessionId, bundlePurchaseId: $bundlePurchaseId }
    ) {
      booking { id status }
      payment { id amountCents currency status }
      bundlePurchase { id creditsRemaining }
      errors
    }
  }
`

export const CREATE_SETUP_INTENT = gql`
  mutation CreateSetupIntent($studioId: ID) {
    createSetupIntent(input: { studioId: $studioId }) {
      clientSecret
      client {
        id
        stripeCustomerId
        stripeDefaultPaymentMethodId
        stripeDefaultPaymentMethodBrand
        stripeDefaultPaymentMethodLast4
        stripeDefaultPaymentMethodExpMonth
        stripeDefaultPaymentMethodExpYear
      }
      errors
    }
  }
`

export const SAVE_MY_PAYMENT_METHOD = gql`
  mutation SaveMyPaymentMethod($paymentMethodId: String!, $studioId: ID) {
    saveMyPaymentMethod(input: { paymentMethodId: $paymentMethodId, studioId: $studioId }) {
      client {
        id
        stripeCustomerId
        stripeDefaultPaymentMethodId
        stripeDefaultPaymentMethodBrand
        stripeDefaultPaymentMethodLast4
        stripeDefaultPaymentMethodExpMonth
        stripeDefaultPaymentMethodExpYear
        clientPaymentMethods {
          id
          stripePaymentMethodId
          brand
          last4
          expMonth
          expYear
          default
          createdAt
        }
      }
      errors
    }
  }
`

export const REMOVE_MY_PAYMENT_METHOD = gql`
  mutation RemoveMyPaymentMethod($paymentMethodId: String, $studioId: ID) {
    removeMyPaymentMethod(input: { paymentMethodId: $paymentMethodId, studioId: $studioId }) {
      client {
        id
        stripeDefaultPaymentMethodId
        stripeDefaultPaymentMethodBrand
        stripeDefaultPaymentMethodLast4
        stripeDefaultPaymentMethodExpMonth
        stripeDefaultPaymentMethodExpYear
        clientPaymentMethods {
          id
          stripePaymentMethodId
          brand
          last4
          expMonth
          expYear
          default
          createdAt
        }
      }
      errors
    }
  }
`

export const SET_MY_DEFAULT_PAYMENT_METHOD = gql`
  mutation SetMyDefaultPaymentMethod($paymentMethodId: String!, $studioId: ID) {
    setMyDefaultPaymentMethod(input: { paymentMethodId: $paymentMethodId, studioId: $studioId }) {
      client {
        id
        stripeDefaultPaymentMethodId
        stripeDefaultPaymentMethodBrand
        stripeDefaultPaymentMethodLast4
        stripeDefaultPaymentMethodExpMonth
        stripeDefaultPaymentMethodExpYear
        clientPaymentMethods {
          id
          stripePaymentMethodId
          brand
          last4
          expMonth
          expYear
          default
          createdAt
        }
      }
      errors
    }
  }
`

export const UPDATE_PAYMENT_SETTINGS = gql`
  mutation UpdatePaymentSettings(
    $stripePublishableKey: String
    $stripeSecretKey: String
    $stripeWebhookSecret: String
    $defaultCurrency: String
    $enabled: Boolean
    $dashboardTitle: String
    $defaultTheme: String
    $ownerPageLayout: JSON
    $clientsPageEnabled: Boolean
  ) {
    updatePaymentSettings(
      input: {
        stripePublishableKey: $stripePublishableKey
        stripeSecretKey: $stripeSecretKey
        stripeWebhookSecret: $stripeWebhookSecret
        defaultCurrency: $defaultCurrency
        enabled: $enabled
        dashboardTitle: $dashboardTitle
        defaultTheme: $defaultTheme
        ownerPageLayout: $ownerPageLayout
        clientsPageEnabled: $clientsPageEnabled
      }
    ) {
      paymentSettings {
        id
        stripePublishableKey
        defaultCurrency
        enabled
        configured
        dashboardTitle
        defaultTheme
        ownerPageLayout
        clientsPageEnabled
      }
      errors
    }
  }
`

export const UPSERT_STUDIO_SUBSCRIPTION = gql`
  mutation UpsertStudioSubscription(
    $studioId: ID!
    $tier: String
    $status: String
    $stripeCustomerId: String
    $stripeSubscriptionId: String
    $currentPeriodEnd: ISO8601DateTime
    $notes: String
  ) {
    upsertStudioSubscription(input: {
      studioId: $studioId
      tier: $tier
      status: $status
      stripeCustomerId: $stripeCustomerId
      stripeSubscriptionId: $stripeSubscriptionId
      currentPeriodEnd: $currentPeriodEnd
      notes: $notes
    }) {
      studioSubscription {
        id
        studioId
        tier
        status
        stripeCustomerId
        stripeSubscriptionId
        currentPeriodEnd
        cancelledAt
        notes
        priceCad
        active
        updatedAt
        studio { id name slug }
      }
      errors
    }
  }
`

export const CREATE_PLATFORM_SUBSCRIPTION_CHECKOUT = gql`
  mutation CreatePlatformSubscriptionCheckout($tier: String!) {
    createPlatformSubscriptionCheckout(input: { tier: $tier }) {
      checkoutUrl
      errors
    }
  }
`

export const UPDATE_STUDIO = gql`
  mutation UpdateStudio($name: String, $slug: String) {
    updateStudio(input: { name: $name, slug: $slug }) {
      studio { id name slug onboardingCompleted }
      errors
    }
  }
`

export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding {
    completeOnboarding(input: {}) {
      studio { id name slug onboardingCompleted }
      errors
    }
  }
`

export const INVITE_CLIENT = gql`
  mutation InviteClient($email: String!, $name: String) {
    inviteClient(input: { email: $email, name: $name }) {
      invitation {
        id
        email
        name
        token
        status
        expiresAt
        createdAt
        invitedByName
      }
      signupUrl
      errors
    }
  }
`
