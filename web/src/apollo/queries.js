import { gql } from "@apollo/client";

export const CLASS_TEMPLATES = gql`
  query ClassTemplates(
    $instructorId: ID
    $studioLocationId: ID
    $studioId: ID
  ) {
    classTemplates(
      instructorId: $instructorId
      studioLocationId: $studioLocationId
      studioId: $studioId
    ) {
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
      studioLocation {
        id
        name
      }
      instructor {
        id
        name
        email
      }
    }
  }
`;

export const CLASS_SESSIONS = gql`
  query ClassSessions(
    $from: ISO8601DateTime
    $to: ISO8601DateTime
    $studioLocationId: ID
    $studioId: ID
  ) {
    classSessions(
      from: $from
      to: $to
      studioLocationId: $studioLocationId
      studioId: $studioId
    ) {
      id
      startTime
      endTime
      capacity
      room
      bundleEnabled
      bundleSpots
      bundleSpotsTaken
      bundleSpotsAvailable
      classTemplate {
        id
        title
        priceCents
        currency
        durationMinutes
      }
      seatsAvailable
      instructor {
        id
        name
        avatarUrl
      }
    }
  }
`;

export const BUNDLE_PRODUCTS = gql`
  query BundleProducts {
    bundleProducts {
      id
      title
      description
      active
      creditsCount
      priceCents
      currency
      classTemplate {
        id
        title
      }
      instructor {
        id
        name
        email
      }
    }
  }
`;

export const BUNDLE_SHOP_PRODUCTS = gql`
  query BundleShopProducts($studioId: ID!, $currency: String) {
    bundleShopProducts(studioId: $studioId, currency: $currency) {
      id
      title
      description
      active
      creditsCount
      priceCents
      currency
      classTemplate {
        id
        title
      }
      instructor {
        id
        name
        email
      }
    }
  }
`;

export const MY_BUNDLE_PURCHASES = gql`
  query MyBundlePurchases($studioId: ID) {
    myBundlePurchases(studioId: $studioId) {
      id
      status
      creditsTotal
      creditsRemaining
      priceCents
      currency
      createdAt
      bundleProduct {
        id
        title
        description
        creditsCount
        currency
      }
    }
  }
`;

export const BUNDLE_PRODUCTS_FOR_CLASS_SESSION = gql`
  query BundleProductsForClassSession($classSessionId: ID!) {
    bundleProductsForClassSession(classSessionId: $classSessionId) {
      id
      title
      creditsCount
      priceCents
      currency
      classTemplate {
        id
        title
      }
      instructor {
        id
        name
      }
    }
  }
`;

export const CURRENT_USER = gql`
  query CurrentUser {
    currentUser {
      id
      studioId
      email
      name
      role
      roleName
      godmode
      active
      availableForSessions
    }
  }
`;

export const STUDIOS = gql`
  query Studios {
    studios {
      id
      name
      studioLocations {
        id
        name
      }
    }
  }
`;

export const STUDIO_SHOW = gql`
  query StudioShow($id: ID!) {
    studio(id: $id) {
      id
      name
      studioLocations {
        id
        name
      }
      instructors {
        id
        name
        email
        avatarUrl
        availableForSessions
      }
      membershipPlans {
        id
        name
        description
        priceCents
        currency
        reformerClassesPerMonth
        matClassesPerMonth
        includesPriorityBooking
        includesEarlyBooking
        privateSessionDiscountPercent
        guestPassesPerMonth
        includesRetailDiscount
        minCommitmentMonths
        autoRenew
        active
      }
      upcomingClassSessions(limit: 30) {
        id
        startTime
        endTime
        capacity
        seatsAvailable
        room
        bundleEnabled
        instructor {
          id
          name
        }
        classTemplate {
          id
          title
          durationMinutes
          priceCents
          currency
        }
      }
    }
  }
`;

export const UPCOMING_BOOKABLE_CLASS_SESSIONS_COUNT = gql`
  query UpcomingBookableClassSessionsCount(
    $studioId: ID
    $studioLocationId: ID
  ) {
    upcomingBookableClassSessionsCount(
      studioId: $studioId
      studioLocationId: $studioLocationId
    )
  }
`;

export const INSTRUCTORS_AND_CLIENTS = gql`
  query InstructorsAndClients {
    instructors {
      id
      name
      email
    }
    clients {
      id
      name
      email
      phone
    }
  }
`;

export const INSTRUCTORS = gql`
  query Instructors {
    instructors {
      id
      name
      email
    }
  }
`;

export const ALL_USERS = gql`
  query AllUsers($studioId: ID) {
    users(studioId: $studioId) {
      id
      studioId
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
`;

export const INSTRUCTOR_EARNINGS_WEEKS = gql`
  query InstructorEarningsWeeks(
    $weekStart: ISO8601Date!
    $weekEnd: ISO8601Date
    $instructorId: ID
    $currency: String
    $studioId: ID
  ) {
    instructorEarningsWeeks(
      weekStart: $weekStart
      weekEnd: $weekEnd
      instructorId: $instructorId
      currency: $currency
      studioId: $studioId
    ) {
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
        classTemplate {
          id
          title
          compensationType
          instructorSplitPercent
          instructorFlatRateCents
        }
        grossCents
        instructorEarningsCents
      }
    }
  }
`;

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
      bundlePurchase {
        id
        creditsTotal
        creditsRemaining
        bundleProduct {
          id
          title
        }
      }
      client {
        id
        name
        email
      }
      classSession {
        id
        startTime
        room
        classTemplate {
          id
          title
          priceCents
        }
        instructor {
          id
          name
        }
      }
    }
  }
`;

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
      bundlePurchase {
        id
        creditsTotal
        creditsRemaining
        bundleProduct {
          id
          title
        }
      }
      client {
        id
        name
        email
      }
      classSession {
        id
        startTime
        room
        classTemplate {
          id
          title
          priceCents
        }
        instructor {
          id
          name
        }
      }
    }
  }
`;

export const CLIENTS = gql`
  query Clients {
    clients {
      id
      name
      email
      phone
      user {
        id
      }
    }
  }
`;

export const CLIENT_PROFILE = gql`
  query ClientProfile($id: ID!) {
    client(id: $id) {
      id
      name
      email
      phone
      characteristicScores
      clientNotes {
        id
        body
        createdAt
        author {
          id
          name
          email
        }
      }
      bookings(limit: 300) {
        id
        status
        paid
        archived
        createdAt
        payment {
          id
          amountCents
          currency
          status
        }
        classSession {
          id
          startTime
          classTemplate {
            id
            title
          }
          instructor {
            id
            name
          }
        }
      }
    }
  }
`;

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
`;

export const PAYMENT_PUBLIC_SETTINGS = gql`
  query PaymentPublicSettings($studioId: ID) {
    paymentPublicSettings(studioId: $studioId) {
      stripePublishableKey
      defaultCurrency
      enabled
      configured
    }
  }
`;

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
    }
  }
`;

export const MY_PAYMENT_METHODS = gql`
  query MyPaymentMethods {
    myPaymentMethods {
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
`;

export const STUDIO_SETTINGS = gql`
  query StudioSettings($studioId: ID) {
    studioSettings(studioId: $studioId) {
      dashboardTitle
      defaultTheme
      clientsPageEnabled
    }
  }
`;

export const MY_FAVORITE_CLASS_SESSIONS = gql`
  query MyFavoriteClassSessions($studioId: ID, $studioLocationId: ID) {
    myFavoriteClassSessions(
      studioId: $studioId
      studioLocationId: $studioLocationId
    ) {
      id
      studioId
      startTime
      endTime
      capacity
      room
      seatsAvailable
      instructor {
        id
        name
      }
      classTemplate {
        id
        title
        description
        durationMinutes
        priceCents
        currency
        studioLocation {
          id
          name
        }
        instructor {
          id
          name
          email
        }
      }
    }
  }
`;

export const PAYMENTS = gql`
  query Payments {
    payments {
      id
      amountCents
      currency
      status
      errorMessage
      createdAt
      client {
        id
        name
        email
      }
      classSession {
        id
        startTime
        classTemplate {
          id
          title
        }
      }
    }
  }
`;

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
`;

const SUBSCRIPTION_FRAGMENT = gql`
  fragment SubscriptionFields on StudioSubscription {
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
    createdAt
    updatedAt
    studio {
      id
      name
      slug
    }
  }
`;

export const STUDIO_SUBSCRIPTIONS = gql`
  ${SUBSCRIPTION_FRAGMENT}
  query StudioSubscriptions {
    studioSubscriptions {
      ...SubscriptionFields
    }
  }
`;

export const MY_STUDIO_SUBSCRIPTION = gql`
  ${SUBSCRIPTION_FRAGMENT}
  query MyStudioSubscription {
    myStudioSubscription {
      ...SubscriptionFields
    }
  }
`;

export const MY_STUDIO = gql`
  query MyStudio {
    myStudio {
      id
      name
      slug
      inviteCode
      onboardingCompleted
    }
  }
`;

export const CLIENT_INVITATIONS = gql`
  query ClientInvitations {
    clientInvitations {
      id
      email
      name
      token
      status
      expiresAt
      createdAt
      invitedByName
    }
  }
`;

export const CLIENT_INVITATION_BY_TOKEN = gql`
  query ClientInvitationByToken($token: String!) {
    clientInvitationByToken(token: $token) {
      id
      email
      name
      status
      invitedByName
    }
  }
`;

export const MEMBERSHIP_PLANS = gql`
  query MembershipPlans($studioId: ID) {
    membershipPlans(studioId: $studioId) {
      id
      studioId
      name
      description
      priceCents
      currency
      reformerClassesPerMonth
      matClassesPerMonth
      includesPriorityBooking
      includesEarlyBooking
      privateSessionDiscountPercent
      guestPassesPerMonth
      includesRetailDiscount
      minCommitmentMonths
      autoRenew
      active
      position
      enrolledCount
      createdAt
      updatedAt
    }
  }
`;

export const CLIENT_MEMBERSHIPS = gql`
  query ClientMemberships(
    $clientId: ID
    $membershipPlanId: ID
    $status: String
  ) {
    clientMemberships(
      clientId: $clientId
      membershipPlanId: $membershipPlanId
      status: $status
    ) {
      id
      studioId
      status
      startedAt
      endsAt
      cancelledAt
      notes
      createdAt
      client {
        id
        name
        email
      }
      membershipPlan {
        id
        name
        priceCents
        currency
        reformerClassesPerMonth
        matClassesPerMonth
        includesPriorityBooking
        includesEarlyBooking
        privateSessionDiscountPercent
        guestPassesPerMonth
        includesRetailDiscount
        minCommitmentMonths
        autoRenew
      }
    }
  }
`;

export const PLATFORM_PAYMENT_SETTINGS = gql`
  query PlatformPaymentSettings {
    platformPaymentSettings {
      stripePublishableKey
      configured
    }
  }
`;

export const PLATFORM_STATS = gql`
  query PlatformStats {
    platformStats {
      studiosCount
      activeSubscriptionsCount
      totalUsersCount
      totalClientsCount
      totalBookingsCount
      confirmedBookingsCount
      totalPaymentsCount
      totalRevenueCents
      newStudiosThisMonth
      subscriptionsByTier
    }
  }
`;

export const MODERATORS = gql`
  query Moderators {
    moderators {
      id
      email
      name
      roleName
      active
      createdAt
    }
  }
`;

export const CREATE_MODERATOR = gql`
  mutation CreateModerator($email: String!, $name: String) {
    createModerator(input: { email: $email, name: $name }) {
      user {
        id
        email
        name
        roleName
        active
      }
      plaintextPassword
      errors
    }
  }
`;

export const SESSION_BOOKINGS = gql`
  query SessionBookings($classSessionId: ID!) {
    bookings(classSessionId: $classSessionId) {
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
      }
      client {
        id
        name
        email
      }
      classSession {
        id
        startTime
        endTime
        capacity
        room
        classTemplate {
          id
          title
          priceCents
          currency
        }
        instructor {
          id
          name
        }
      }
    }
  }
`;

export const PUBLIC_CLASS_PAGE = gql`
  query PublicClassPage($studioInviteCode: String!, $templateId: ID!) {
    publicClassPage(
      studioInviteCode: $studioInviteCode
      templateId: $templateId
    ) {
      studioName
      studioInviteCode
      template {
        id
        title
        description
        capacity
        durationMinutes
        priceCents
        currency
        instructor {
          id
          name
          avatarUrl
        }
        studioLocation {
          id
          name
        }
      }
      upcomingSessions {
        id
        startTime
        endTime
        capacity
        room
        seatsAvailable
        instructor {
          id
          name
          avatarUrl
        }
      }
    }
  }
`;
