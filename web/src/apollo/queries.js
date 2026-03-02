import { gql } from '@apollo/client'

export const CLASS_TEMPLATES = gql`
  query ClassTemplates($instructorId: ID, $studioLocationId: ID, $studioId: ID) {
    classTemplates(instructorId: $instructorId, studioLocationId: $studioLocationId, studioId: $studioId) {
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
      studioLocation { id name }
      instructor { id name email }
    }
  }
`

export const CLASS_SESSIONS = gql`
  query ClassSessions($from: ISO8601DateTime, $to: ISO8601DateTime, $studioLocationId: ID, $studioId: ID) {
    classSessions(from: $from, to: $to, studioLocationId: $studioLocationId, studioId: $studioId) {
      id
      startTime
      endTime
      capacity
      room
      classTemplate { id title priceCents currency durationMinutes }
      seatsAvailable
      instructor { id name }
    }
  }
`

export const CURRENT_USER = gql`
  query CurrentUser {
    currentUser { id studioId email name role roleName active availableForSessions }
  }
`

export const STUDIOS = gql`
  query Studios {
    studios {
      id
      name
    }
  }
`

export const UPCOMING_BOOKABLE_CLASS_SESSIONS_COUNT = gql`
  query UpcomingBookableClassSessionsCount($studioId: ID, $studioLocationId: ID) {
    upcomingBookableClassSessionsCount(studioId: $studioId, studioLocationId: $studioLocationId)
  }
`

export const INSTRUCTORS_AND_CLIENTS = gql`
  query InstructorsAndClients {
    instructors { id name email }
    clients { id name email phone }
  }
`

export const INSTRUCTORS = gql`
  query Instructors {
    instructors { id name email }
  }
`

export const ALL_USERS = gql`
  query AllUsers {
    users {
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
  }
`

export const INSTRUCTOR_EARNINGS_WEEKS = gql`
  query InstructorEarningsWeeks($weekStart: ISO8601Date!, $weekEnd: ISO8601Date, $instructorId: ID, $currency: String) {
    instructorEarningsWeeks(weekStart: $weekStart, weekEnd: $weekEnd, instructorId: $instructorId, currency: $currency) {
      instructor {
        id
        name
        email
        instructorCompensationType
        instructorDefaultSplitPercent
        instructorDefaultFlatRateCents
        stripeConnectAccountId
        stripeConnectOnboardingCompleted
      }
      currency
      weekStart
      weekEnd
      grossCents
      instructorEarningsCents
      studioCutCents
      sessionsTaughtCount
      paymentsCount
      existingPayout {
        id
        status
        paidAt
        stripeTransferId
        paidMethod
        paidReference
      }
      templateBreakdown {
        classTemplate { id title compensationType instructorSplitPercent instructorFlatRateCents }
        grossCents
        instructorEarningsCents
      }
    }
  }
`

export const BOOKINGS = gql`
  query Bookings($studioLocationId: ID, $studioId: ID) {
    bookings(studioLocationId: $studioLocationId, studioId: $studioId) {
      id
      studioId
      slug
      status
      paid
      priceCents
      archived
      createdAt
      payment {
        id
        amountCents
        currency
        status
        errorMessage
        createdAt
      }
      client { id name email }
      classSession {
        id
        startTime
        room
        classTemplate { id title priceCents }
        instructor { id name }
      }
    }
  }
`

export const MY_BOOKINGS = gql`
  query MyBookings($studioLocationId: ID, $studioId: ID) {
    myBookings(studioLocationId: $studioLocationId, studioId: $studioId) {
      id
      studioId
      slug
      status
      paid
      priceCents
      archived
      createdAt
      payment {
        id
        amountCents
        currency
        status
        errorMessage
        createdAt
      }
      client { id name email }
      classSession {
        id
        startTime
        room
        classTemplate { id title priceCents }
        instructor { id name }
      }
    }
  }
`

export const CLIENTS = gql`
  query Clients {
    clients { id name email phone user { id } }
  }
`

export const PAYMENT_SETTINGS = gql`
  query PaymentSettings {
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
  }
`

export const PAYMENT_PUBLIC_SETTINGS = gql`
  query PaymentPublicSettings($studioId: ID) {
    paymentPublicSettings(studioId: $studioId) {
      stripePublishableKey
      defaultCurrency
      enabled
      configured
    }
  }
`

export const MY_CLIENT = gql`
  query MyClient($studioId: ID) {
    myClient(studioId: $studioId) {
      id
      name
      email
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
  }
`

export const STUDIO_SETTINGS = gql`
  query StudioSettings($studioId: ID) {
    studioSettings(studioId: $studioId) {
      dashboardTitle
      defaultTheme
      clientsPageEnabled
    }
  }
`

export const MY_FAVORITE_CLASS_SESSIONS = gql`
  query MyFavoriteClassSessions($studioId: ID, $studioLocationId: ID) {
    myFavoriteClassSessions(studioId: $studioId, studioLocationId: $studioLocationId) {
      id
      startTime
      endTime
      capacity
      room
      seatsAvailable
      instructor { id name }
      classTemplate {
        id
        title
        description
        durationMinutes
        priceCents
        currency
        studioLocation { id name }
        instructor { id name email }
      }
    }
  }
`

export const PAYMENTS = gql`
  query Payments {
    payments {
      id
      amountCents
      currency
      status
      errorMessage
      createdAt
      client { id name email }
      classSession {
        id
        startTime
        classTemplate { id title }
      }
    }
  }
`

export const STUDIO_LOCATIONS = gql`
  query StudioLocations($studioId: ID) {
    studioLocations(studioId: $studioId) {
      id
      name
      address
      city
      state
      zip
    }
  }
`
