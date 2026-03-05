import {
  STUDIO_SETTINGS,
  CURRENT_USER,
  CLASS_TEMPLATES,
  INSTRUCTORS,
  ALL_USERS,
  BOOKINGS,
  CLIENTS,
  PAYMENT_SETTINGS,
  PAYMENTS,
  STUDIO_LOCATIONS,
  CLASS_SESSIONS,
  PAYMENT_PUBLIC_SETTINGS,
  MY_CLIENT,
} from "../../apollo/queries";

export function studioSettingsMock(overrides = {}) {
  return {
    request: { query: STUDIO_SETTINGS, variables: {} },
    result: {
      data: {
        studioSettings: {
          dashboardTitle: "StudioFlow",
          defaultTheme: "dark",
          clientsPageEnabled: true,
          __typename: "StudioSetting",
          ...overrides,
        },
      },
    },
  };
}

export function currentUserMock(user) {
  return {
    request: { query: CURRENT_USER, variables: {} },
    result: {
      data: {
        currentUser: {
          __typename: "User",
          ...user,
        },
      },
    },
  };
}

export function classTemplatesMock({
  templates = [],
  studioLocationId = null,
  instructorId,
} = {}) {
  const variables = { studioLocationId };
  if (typeof instructorId !== "undefined")
    variables.instructorId = instructorId;

  return {
    request: { query: CLASS_TEMPLATES, variables },
    result: {
      data: {
        classTemplates: templates.map((t) => ({
          __typename: "ClassTemplate",
          ...t,
        })),
      },
    },
  };
}

export function instructorsMock(instructors = []) {
  return {
    request: { query: INSTRUCTORS, variables: {} },
    result: {
      data: {
        instructors: instructors.map((i) => ({ __typename: "User", ...i })),
      },
    },
  };
}

export function ownerDashboardDataMocks() {
  return [
    {
      request: { query: ALL_USERS, variables: {} },
      result: { data: { users: [] } },
    },
    {
      request: { query: BOOKINGS, variables: {} },
      result: { data: { bookings: [] } },
    },
    {
      request: { query: CLIENTS, variables: {} },
      result: { data: { clients: [] } },
    },
    {
      request: { query: PAYMENT_SETTINGS, variables: {} },
      result: {
        data: {
          paymentSettings: {
            id: "ps-1",
            stripePublishableKey: null,
            defaultCurrency: "cad",
            enabled: false,
            configured: false,
            dashboardTitle: "StudioFlow",
            defaultTheme: "dark",
            ownerPageLayout: {},
            __typename: "PaymentSetting",
          },
        },
      },
    },
    {
      request: { query: PAYMENTS, variables: {} },
      result: { data: { payments: [] } },
    },
  ];
}

export function studioLocationsMock(locations = []) {
  return {
    request: { query: STUDIO_LOCATIONS, variables: {} },
    result: {
      data: {
        studioLocations: locations.map((l) => ({
          __typename: "StudioLocation",
          ...l,
        })),
      },
    },
  };
}

export function classSessionsMock({
  sessions = [],
  variables = { from: null, to: null },
} = {}) {
  return {
    request: { query: CLASS_SESSIONS, variables },
    result: {
      data: {
        classSessions: sessions.map((s) => ({
          __typename: "ClassSession",
          ...s,
        })),
      },
    },
  };
}

export function paymentPublicSettingsMock(overrides = {}, variables = {}) {
  return {
    request: { query: PAYMENT_PUBLIC_SETTINGS, variables },
    result: {
      data: {
        paymentPublicSettings: {
          stripePublishableKey: "pk_test_123",
          defaultCurrency: "cad",
          enabled: true,
          configured: true,
          __typename: "PaymentPublicSetting",
          ...overrides,
        },
      },
    },
  };
}

export function myClientMock(client = null, variables = {}) {
  return {
    request: { query: MY_CLIENT, variables },
    result: {
      data: {
        myClient: client
          ? {
              __typename: "Client",
              ...client,
              clientPaymentMethods: (client.clientPaymentMethods || []).map(
                (m) => ({ __typename: "ClientPaymentMethod", ...m }),
              ),
            }
          : null,
      },
    },
  };
}
