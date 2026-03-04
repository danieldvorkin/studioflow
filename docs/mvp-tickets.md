# JoinStudioFlow MVP – Ticket Backlog

> **Positioning:** The operational backbone for modern creative and multi-use studios.
>
> **Target verticals:** Fitness · Music · Photography/Video · Shared creative workspaces · Boutique multi-use studios

---

## Surface Area Tags

| Tag | Description |
|-----|-------------|
| `[booking]` | Booking UX, session pages, scheduling flow |
| `[payments]` | Stripe integration, checkout, payouts |
| `[auth/roles]` | Authentication, role-based permissions, access control |
| `[messaging]` | Inbox, notifications, client ↔ staff communication |
| `[resources]` | Room booking, equipment rentals, gear add-ons |
| `[shop]` | Studio shop, product listings, retail sales |
| `[analytics]` | Owner dashboard, reporting, revenue metrics |
| `[email-marketing]` | Automated emails, marketing campaigns, drip flows |
| `[onboarding]` | Studio setup wizard, multi-vertical configuration |
| `[pricing]` | Tiered platform plans, feature gating |
| `[backend]` | API, GraphQL schema, data model changes |
| `[frontend]` | UI/UX, component improvements, design polish |

---

## Priority 1 — Adoption Drivers

These tickets unblock acquisition and reduce churn at the entry level.

---

### TICKET-001: Booking UX Overhaul – Client-Facing Session Pages

**Tags:** `[booking]` `[frontend]`
**Priority:** P1

#### Problem
The current class detail and booking pages (`ClassDetail.jsx`, `PublicClassDetail.jsx`, `BookingShow.jsx`) lack a premium feel. Clients experience friction when discovering, reviewing, and booking a session.

#### Goal
Deliver a polished, conversion-optimised booking experience for clients — whether they arrive via a direct link, the studio portal, or a public listing.

#### Acceptance Criteria
- [ ] Public class detail page (`/studios/:slug/classes/:id`) shows: title, instructor name & avatar, date/time, duration, location/room, capacity remaining, price, and a clear CTA button
- [ ] Authenticated booking confirmation screen shows a summary card with all booking details before charging
- [ ] A "spots remaining" indicator updates in real time (or near real time via polling)
- [ ] Session page degrades gracefully when the class is full (show waitlist option or "Notify me" state)
- [ ] Mobile layout is tested and responsive at 375 px and 768 px breakpoints
- [ ] Page titles use the `useDocumentTitle` hook consistently (already present in `Analytics.jsx`)

#### Technical Notes
- `class_sessions` table has `capacity`, `start_time`, `end_time`, `room`, `instructor_id`
- Booking count can be derived from `bookings` where `status != cancelled`
- `PublicClassPageType` GraphQL type already exists — extend it with `spots_remaining` computed field
- Waitlist status maps to `Booking.statuses[:waitlisted]` (already in the enum)

---

### TICKET-002: Booking UX Overhaul – Owner/Staff Session Management View

**Tags:** `[booking]` `[frontend]` `[auth/roles]`
**Priority:** P1

#### Problem
Owners and staff need a clear operational view of upcoming sessions: who is booked, payment status, and quick actions (cancel, mark no-show, send reminder).

#### Goal
A dedicated session detail panel for staff/owners that surfaces operational data at a glance.

#### Acceptance Criteria
- [ ] Session detail view (owner side) shows: roster with client name, booking status, paid/unpaid badge, and booking slug
- [ ] Quick-action buttons per booking row: Cancel, Mark No-Show, Send Payment Reminder
- [ ] Aggregate stats at the top: confirmed bookings / capacity, total revenue collected, outstanding balance
- [ ] Filter roster by status (Booked, Waitlisted, Cancelled, No-Show)
- [ ] "Send Payment Reminder" triggers the existing `sendBookingPaymentReminder` mutation

#### Technical Notes
- Booking statuses already defined: `booked`, `waitlisted`, `cancelled`, `no_show` (in `Booking` model)
- `sendBookingPaymentReminder` mutation already exists in `MutationType`
- Payment status is on `bookings.paid` boolean
- Pundit policies exist for bookings (`BookingPolicy`) — enforce staff/owner gate

---

### TICKET-003: Stripe Payment Flow Refinement

**Tags:** `[payments]` `[frontend]` `[backend]`
**Priority:** P1

#### Problem
The current Stripe integration covers the basics (checkout session, setup intent, payment intent) but lacks error recovery, clear status feedback, and a unified payment state machine.

#### Goal
A resilient, user-friendly payment experience with clear success/failure/pending states and retry capability.

#### Acceptance Criteria
- [ ] Client booking flow shows a clear payment status screen after checkout: Success, Pending, or Failed with actionable message
- [ ] Failed payments surface a retry option (re-attempt with same or new card) without losing booking intent
- [ ] Payment method saved during checkout is reflected immediately in the client's payment methods list
- [ ] Owner can void/refund a payment from the booking detail view (new mutation or extend existing `archiveBooking`)
- [ ] Stripe webhook handler (`PlatformWebhooksController`) processes `payment_intent.payment_failed` and updates `payments.status` to `failed`
- [ ] All Stripe errors are caught and returned as structured GraphQL errors (not 500s)

#### Technical Notes
- `payments` table has `status` (pending/succeeded/failed), `stripe_payment_intent_id`, `error_message`
- Existing mutations: `createBookingWithPayment`, `createBookingCheckoutSession`, `confirmBookingCheckoutPayment`
- `PlatformWebhooksController` handles Stripe webhooks — extend to handle `payment_intent.payment_failed`
- `client_payment_methods` table stores saved cards; link to `clients.stripe_default_payment_method_id`
- Web: `payments/` directory exists — consolidate payment state components there

---

### TICKET-004: Role-Based Access Control (RBAC) Hardening

**Tags:** `[auth/roles]` `[backend]` `[frontend]`
**Priority:** P1

#### Problem
User roles are defined (`owner`, `staff`, `instructor`, `client`, `moderator`) in `User::ROLES` but permission enforcement is inconsistent across GraphQL mutations and frontend routes. Several mutations lack Pundit policy guards; the frontend renders actions regardless of role.

#### Goal
Consistent, enforced RBAC across the full stack — server-side via Pundit policies and client-side via role-gated UI.

#### Acceptance Criteria
- [ ] Every GraphQL mutation has a corresponding Pundit policy check that rejects unauthorised callers with a clear error
- [ ] Frontend route guard (`ProtectedRoute` or equivalent) prevents navigation to owner/staff pages by lower-privilege users
- [ ] The following role matrix is enforced:

| Action | Owner | Staff | Instructor | Client | Moderator |
|--------|-------|-------|------------|--------|-----------|
| Manage class templates | ✅ | ✅ | ❌ | ❌ | ✅ |
| Create/cancel bookings | ✅ | ✅ | ✅ (own) | ✅ (own) | ✅ |
| View all clients | ✅ | ✅ | ❌ | ❌ | ✅ |
| Manage membership plans | ✅ | ❌ | ❌ | ❌ | ✅ |
| Process instructor payouts | ✅ | ❌ | ❌ | ❌ | ✅ |
| Update payment settings | ✅ | ❌ | ❌ | ❌ | ✅ |
| Invite users | ✅ | ✅ | ❌ | ❌ | ✅ |
| Block clients | ✅ | ✅ | ✅ (own) | ❌ | ✅ |

- [ ] `createModerator` mutation is restricted to godmode/owner only
- [ ] Pundit policy spec coverage for new policies

#### Technical Notes
- Existing policies: `BookingPolicy`, `BundleProductPolicy`, `BundlePurchasePolicy`, `ClassSessionPolicy`, `ClassTemplatePolicy`, `ClientMembershipPolicy`, `InstructorPayoutPolicy`, `MembershipPlanPolicy`
- Policies missing: `ClientPolicy`, `UserPolicy`, `PaymentSettingPolicy`, `StudioLocationPolicy`
- `ApplicationPolicy::Scope` already scopes to `studio_id` — use as base
- Backend: extend `BaseMutation` to call `authorize!` via Pundit before executing
- Frontend: a `useCurrentUser` hook likely wraps the `currentUser` GraphQL query — use `role` field to gate UI elements

---

### TICKET-005: Basic Inbox Messaging System

**Tags:** `[messaging]` `[backend]` `[frontend]`
**Priority:** P1

#### Note
A high-level spec for this feature already exists in GitHub Issue #8. This ticket expands it with technical acceptance criteria grounded in the existing architecture.

#### Problem
There is no in-app communication channel between studio staff and clients. Studios rely on email or external tools, creating friction and missed communications.

#### Goal
A simple, inbox-style messaging system. One-on-one conversations only (group chat is out of scope for MVP).

#### Acceptance Criteria
- [ ] New data models: `conversations` (sender, recipient, studio_id) and `messages` (conversation_id, sender_id, body, read_at)
- [ ] GraphQL mutations: `createConversation`, `sendMessage`, `markConversationRead`
- [ ] GraphQL queries: `myConversations` (paginated, ordered by latest message), `conversation(id:)` with messages
- [ ] Inbox UI: list of conversations with unread badge count, last message preview, and timestamp
- [ ] Message thread UI: chronological message bubbles, sender name/avatar, send input at bottom
- [ ] Unread count displayed in nav/sidebar for quick visibility
- [ ] Permission rules (per Issue #8):
  - Owners can message anyone
  - Staff can message clients and owners
  - Instructors can message clients and owners
  - Clients can message instructors only after the instructor has approved (using existing `instructor_client_blocks` / unblock mechanism)
- [ ] Notification record created in DB on new message (`notifications` table: recipient_id, notifiable_type, notifiable_id, read_at, studio_id)
- [ ] New message email notification sent via existing mailer infrastructure (opt-out available)

#### Technical Notes
- `instructor_client_blocks` model already tracks instructor ↔ client approval state — use as permission gate for client-initiated messages
- Existing mailers in `app/mailers/` — create `MessageMailer`
- Use ActionCable for real-time delivery (Rails already includes it); fallback to polling if ActionCable setup is deferred
- Frontend: `web/src/` directory; create `src/messaging/` feature directory following the `src/payments/` pattern

---

## Priority 2 — Differentiation

These tickets build the "operational backbone" moat and justify premium pricing.

---

### TICKET-006: Resource & Gear Rental Module

**Tags:** `[resources]` `[booking]` `[backend]` `[frontend]`
**Priority:** P2

#### Problem
Studios — especially music, photography, and creative spaces — need to manage physical resources: rooms, instruments, cameras, lighting kits, etc. None of this exists in the current data model.

#### Goal
Allow studio owners to define rentable resources (rooms, equipment) and let clients add them to bookings or create standalone rental bookings.

#### Acceptance Criteria
- [ ] New models:
  - `resources` (studio_id, name, description, resource_type [room|equipment|other], hourly_rate_cents, currency, capacity, active)
  - `resource_bookings` (resource_id, client_id, studio_id, start_time, end_time, status, price_cents, stripe_payment_intent_id)
- [ ] Conflict detection: prevent double-booking a resource for overlapping time slots
- [ ] Owner/staff can create, edit, deactivate resources
- [ ] Clients can browse available resources with a time-slot picker and book directly
- [ ] Resources can be attached to a `class_session` as included gear (e.g., "this class includes a reformer")
- [ ] Billing: resource bookings go through the existing Stripe flow (`createBookingWithPayment` pattern)
- [ ] Owner dashboard shows resource utilisation rate per resource
- [ ] GraphQL mutations: `createResource`, `updateResource`, `deleteResource`, `createResourceBooking`, `cancelResourceBooking`

#### Technical Notes
- Follow the `studio_locations` pattern for owner-managed resource CRUD
- `class_sessions.room` field currently stores a plain string — migrate to an optional FK to `resources` for linked room management
- Pundit policy: only owner/staff can manage resources; clients can only read available slots and create their own bookings
- Index `resource_bookings` on `(resource_id, start_time, end_time)` for efficient conflict queries

---

### TICKET-007: Studio Shop – Product Listings & Checkout

**Tags:** `[shop]` `[payments]` `[backend]` `[frontend]`
**Priority:** P2

#### Problem
Studios want to sell physical and digital products alongside bookings (mats, water bottles, merchandise, digital guides). There is no product catalogue or retail checkout flow.

#### Goal
A lightweight studio shop where owners list products and clients purchase them, billed via Stripe.

#### Acceptance Criteria
- [ ] New models:
  - `shop_products` (studio_id, name, description, price_cents, currency, category, stock_count, active, image_url)
  - `shop_orders` (client_id, studio_id, status, total_cents, stripe_payment_intent_id)
  - `shop_order_items` (shop_order_id, shop_product_id, quantity, unit_price_cents)
- [ ] Owner/staff product management: create, update, deactivate, set stock levels
- [ ] Client-facing shop page with product grid, category filter, and cart
- [ ] Checkout via Stripe (reuse `createBookingWithPayment` pattern; create `createShopCheckoutSession` mutation)
- [ ] Stock is decremented on successful payment; out-of-stock products show as unavailable
- [ ] Order history visible to client (My Orders page) and owner (all orders with status filter)
- [ ] Membership discount flag: `membership_plans.includes_retail_discount` already exists — apply discount at checkout for members
- [ ] Email confirmation sent to client on order (new `ShopOrderMailer`)

#### Technical Notes
- `membership_plans.includes_retail_discount` is already a boolean on the DB — implement discount % as a new column or fixed percentage defined in payment settings
- Stripe: create a PaymentIntent per order (same pattern as bookings)
- Follow `bundle_products` / `bundle_purchases` pattern for the shop product/order data model
- Frontend: create `src/shop/` feature directory; add `/shop` route accessible from the client nav

---

### TICKET-008: Owner Analytics Dashboard

**Tags:** `[analytics]` `[frontend]` `[backend]`
**Priority:** P2

#### Problem
The existing `Analytics.jsx` page performs client-side aggregation over raw booking and session data. This is fragile, slow for large datasets, and lacks key business metrics owners need to make decisions.

#### Goal
A server-driven analytics dashboard that surfaces the metrics most valuable to studio owners: revenue, booking trends, client retention, and instructor performance.

#### Acceptance Criteria
- [ ] New GraphQL query: `ownerAnalytics(startDate, endDate, locationId)` returning:
  - `totalRevenueCents` (period)
  - `bookingsCount` (by status breakdown)
  - `newClientsCount`
  - `activeClientsCount` (booked at least once in period)
  - `clientRetentionRate`
  - `sessionFillRate` (average % capacity filled per session)
  - `topInstructors` (by sessions taught and revenue generated)
  - `revenueByWeek` (array of `{ weekStart, revenueCents }`)
  - `membershipRevenueCents` vs `dropInRevenueCents` split
- [ ] Frontend dashboard renders: revenue trend line chart, booking status donut, top instructors table, fill-rate bar chart
- [ ] Date range picker (last 7 days, 30 days, 90 days, custom range)
- [ ] Location filter (if studio has multiple `studio_locations`)
- [ ] Export to CSV for revenue and booking data
- [ ] Dashboard is owner/staff only (enforce in policy and route guard)

#### Technical Notes
- Current `Analytics.jsx` fetches `BOOKINGS`, `CLASS_SESSIONS`, `CLASS_TEMPLATES` and computes on the client — migrate aggregations to a dedicated GraphQL resolver
- `instructor_payouts.calculation_snapshot` already stores a JSONB snapshot — reuse this pattern for analytics snapshots
- Use `ActiveRecord` scopes with date-range parameters; avoid N+1 with `.includes`
- Consider a `AnalyticsService` class under `app/services/` for the aggregation logic
- `payment_settings.owner_page_layout` (JSONB) exists — could be used to store dashboard widget preferences

---

### TICKET-009: Email Marketing Automation – Basic Campaigns

**Tags:** `[email-marketing]` `[backend]` `[frontend]`
**Priority:** P2

#### Problem
Studios have no way to communicate with their client base at scale. There is no bulk email, campaign, or drip automation tooling.

#### Goal
A basic email marketing module: owners can create campaigns (one-time blasts) and configure simple automations (e.g., "7 days inactive → re-engagement email").

#### Acceptance Criteria
- [ ] New models:
  - `email_campaigns` (studio_id, name, subject, body_html, status [draft|scheduled|sent], scheduled_at, sent_at, recipient_filter_json)
  - `email_campaign_sends` (email_campaign_id, client_id, sent_at, opened_at, clicked_at)
  - `email_automations` (studio_id, trigger [inactive_7d|inactive_30d|new_member|post_booking], subject, body_html, active)
- [ ] Owner UI: Campaign composer with subject line, rich-text body, recipient filter (all clients / members only / inactive / custom tag)
- [ ] Preview and send-test before publishing
- [ ] Scheduled send (deliver at a specific date/time via ActiveJob)
- [ ] Basic open tracking via a pixel endpoint (new controller action in Rails)
- [ ] Automation triggers:
  - **New member welcome**: sent on `ClientMembership` creation
  - **Post-booking thank you**: sent 1 hour after `Booking` creation
  - **Re-engagement**: sent to clients with no booking in 30 days
  - **Membership renewal reminder**: sent 7 days before `client_memberships.ends_at`
- [ ] Clients can unsubscribe (add `unsubscribed_at` to `clients` table); unsubscribed clients are excluded from all sends
- [ ] Sends are delivered via existing ActionMailer / `SendTestEmail` pattern — extend to use a background job queue

#### Technical Notes
- Existing `app/mailers/` infrastructure — add `CampaignMailer`
- Existing `jobs/` directory — add `SendEmailCampaignJob` and `ProcessEmailAutomationsJob`
- `send_test_email` mutation already exists for godmode — study as a pattern
- For rich text, store `body_html` as a `text` column; use a simple editor in the frontend (e.g., a controlled `<textarea>` for MVP, upgrade to Tiptap/Quill in v2)
- Open tracking pixel: `GET /t/email/:token/open.png` → record `opened_at`, return 1×1 transparent GIF

---

## Later — Advanced Features

These tickets are scoped for after initial traction is established.

---

### TICKET-010: Advanced Communications – Group Chat & Broadcast Messaging

**Tags:** `[messaging]` `[backend]` `[frontend]`
**Priority:** Later

#### Problem
Once the basic inbox is established (TICKET-005), studios will need group communication channels: studio-wide announcements, class-specific group chats, and instructor broadcast messages.

#### Goal
Extend the messaging system with group conversations and broadcast (one-to-many) messaging from owners and instructors.

#### Acceptance Criteria
- [ ] Group conversations: owner/staff can create a group with a name and add multiple participants
- [ ] Broadcast messages: owner sends a message to all clients, all members, or all attendees of a specific class session
- [ ] Broadcast is delivered as individual `messages` (fan-out) to avoid privacy leakage
- [ ] Group conversations are linked to a `class_session` (e.g., "Yoga Tuesday group")
- [ ] Push notification support (web push or in-app badge) for new messages
- [ ] Message read receipts for group conversations
- [ ] Mute/leave group conversation

#### Technical Notes
- Extend `conversations` model with `conversation_type` (direct | group | broadcast) and `class_session_id` (optional FK)
- Fan-out broadcast via `SendBroadcastMessageJob` background job to avoid request timeout
- WebRTC (live/video layer) is explicitly out of scope for this ticket; tracked separately in TICKET-011

---

### TICKET-011: WebRTC Live / Video Layer

**Tags:** `[messaging]` `[backend]` `[frontend]`
**Priority:** Later

#### Problem
Future-state: studios may want to offer live-streamed or video-conferencing sessions directly within the platform (virtual fitness classes, remote music lessons).

#### Goal
Evaluate and integrate a WebRTC solution for live 1:1 and group video within the platform.

#### Acceptance Criteria
- [ ] Technical spike: evaluate Twilio Video vs. Daily.co vs. Jitsi for cost, scalability, and ease of integration
- [ ] Proof of concept: owner/instructor can start a video room linked to a `class_session`
- [ ] Clients with a confirmed booking can join the video room
- [ ] Recording option (stored to S3 or equivalent) for session playback
- [ ] Chat sidebar during video session reuses messaging components from TICKET-005

#### Technical Notes
- This ticket should begin as a technical spike; do not implement until spike output defines integration approach
- Requires additional infrastructure: TURN/STUN server or managed WebRTC service

---

### TICKET-012: Deeper Analytics Engine & Custom Reporting

**Tags:** `[analytics]` `[backend]` `[frontend]`
**Priority:** Later

#### Problem
After the owner analytics dashboard (TICKET-008) is live, power users (growing studios with multiple locations and many instructors) will need deeper customisation: custom date ranges, per-instructor drill-downs, cohort analysis, and scheduled report delivery.

#### Goal
A configurable reporting engine that lets owners build and save custom report views, and schedule automated report emails.

#### Acceptance Criteria
- [ ] Custom report builder: select metrics, group-by dimensions (instructor, location, class type, membership tier), and date range
- [ ] Save custom report as a named "dashboard view" (stored in `payment_settings.owner_page_layout` JSONB or a new `saved_reports` table)
- [ ] Scheduled report delivery: owner selects a saved report and a frequency (weekly/monthly); delivered via email
- [ ] Client lifetime value (LTV) calculation
- [ ] Churn prediction: flag clients at risk based on booking frequency drop
- [ ] Revenue forecasting from active memberships

#### Technical Notes
- Consider a read-replica database connection for heavy analytics queries to avoid impacting production write performance
- `instructor_payouts.calculation_snapshot` JSONB pattern can be extended for analytics snapshots
- May benefit from a dedicated analytics table or materialized views for pre-aggregation

---

### TICKET-013: Niche-Specific Workflow Profiles

**Tags:** `[onboarding]` `[frontend]` `[backend]`
**Priority:** Later

#### Problem
A music studio has very different operational needs than a fitness studio (hourly room rental vs. class-based booking). The current data model and UI are optimised for fitness/pilates. Supporting other verticals requires configurable workflows.

#### Goal
Studio onboarding selects a "studio type" that pre-configures the platform for their vertical, with terminology, default settings, and enabled features adjusted accordingly.

#### Acceptance Criteria
- [ ] `studios` table gains a `studio_type` enum: `fitness | music | photography | creative_workspace | general`
- [ ] Onboarding wizard (extend `CompleteOnboarding` mutation) prompts for studio type
- [ ] Studio type gates feature visibility:
  - `fitness`: class templates, capacity, membership plans (current defaults)
  - `music`: resource booking (rooms/instruments), hourly pricing, no class capacity
  - `photography`: gear rentals, project-based bookings, add-ons
  - `creative_workspace`: hot-desking, resource time slots, membership day passes
- [ ] UI terminology adapts: "Classes" → "Sessions" (music), "Bookings" → "Reservations" (photography), etc. — controlled via a localisation/config layer
- [ ] Studio type can be changed by owner with a warning about feature visibility changes

#### Technical Notes
- Add `studio_type` column to `studios` table (migration required)
- Terminology config: a JSON/YAML config map per studio type, loaded client-side
- Feature flags per studio type can be stored in `payment_settings` JSONB or a new `studio_feature_flags` table
- This ticket depends on TICKET-006 (Resources) being complete for non-fitness verticals

---

## Sub-Project: Platform Pricing & Tier Architecture

### TICKET-014: Tiered Platform Subscription Plans

**Tags:** `[pricing]` `[backend]` `[frontend]` `[payments]`
**Priority:** P1 (foundational for monetisation)

#### Problem
The current `studio_subscriptions` table has a `tier` field (`basic`) and Stripe subscription integration, but there is no enforced feature-gating between tiers, and the pricing structure is not yet production-ready.

#### Goal
Define and enforce at least two clear pricing tiers with feature gating, reducing acquisition friction while creating an upsell path.

#### Acceptance Criteria
- [ ] Two initial tiers defined in code and billing:
  - **Starter** (~$49 CAD/month): Booking, Stripe payments, unlimited clients, basic reporting, 1 location
  - **Pro** (~$99 CAD/month): Everything in Starter + multi-location, resource management, email marketing, advanced analytics, team roles (staff/instructors)
- [ ] `studio_subscriptions.tier` enum updated to: `starter | pro | enterprise`
- [ ] `FeatureGate` service/concern in Rails that checks `studio.subscription.tier` before allowing gated operations
- [ ] Gated mutations return a structured error (`UPGRADE_REQUIRED`) when called outside of allowed tier
- [ ] Frontend shows upgrade prompt/modal when a user hits a tier gate
- [ ] Stripe: separate Price IDs configured per tier in payment settings or environment variables
- [ ] `GodmodeDashboard` shows tier breakdown across all studios

#### Technical Notes
- `studio_subscriptions` table already has `tier`, `stripe_subscription_id`, `status`, `current_period_end`
- `UpsertStudioSubscription` mutation exists — extend to accept `tier` and handle plan changes (upgrade/downgrade via Stripe `subscription.update`)
- `CreatePlatformSubscriptionCheckout` mutation handles initial checkout — extend to accept tier param
- Enterprise tier can be manually provisioned via godmode until volume justifies self-serve

---

### TICKET-015: Studio Onboarding & Value-Demonstration Flow

**Tags:** `[onboarding]` `[frontend]` `[backend]`
**Priority:** P1

#### Problem
New studios complete onboarding (`CompleteOnboarding` mutation) but there is no guided experience that demonstrates value quickly. Studios drop off before setting up their first class.

#### Goal
A step-by-step onboarding wizard that guides a new studio owner to their first live booking within 10 minutes.

#### Acceptance Criteria
- [ ] Onboarding wizard steps (can be skipped but progress tracked):
  1. Studio name & type (links to TICKET-013)
  2. Add first studio location
  3. Connect Stripe (link to Stripe Connect onboarding — `createInstructorConnectOnboarding` pattern)
  4. Create first class template
  5. Schedule first session
  6. Invite first client
- [ ] Progress is persisted server-side (`studios.onboarding_completed_at` exists; add `onboarding_step` integer or JSONB `onboarding_progress`)
- [ ] Checklist widget visible on owner dashboard until onboarding is complete
- [ ] "Quick start" sample data option: pre-populates a class template and session for demonstration
- [ ] Completion triggers a congratulatory email via `ActionMailer`

#### Technical Notes
- `studios.onboarding_completed_at` already exists — add `onboarding_progress` JSONB column
- `CompleteOnboarding` mutation exists — extend or create step-specific mutations
- `OnboardingModal.jsx` component exists in `web/src/components/` — extend this for the wizard UI
- The wizard should be resumable: if the owner closes mid-flow, they return to the same step

---

## Summary by Priority

| Priority | Ticket | Surface Area |
|----------|--------|--------------|
| P1 | TICKET-001: Client-Facing Session Pages | `[booking]` `[frontend]` |
| P1 | TICKET-002: Owner Session Management View | `[booking]` `[frontend]` `[auth/roles]` |
| P1 | TICKET-003: Stripe Payment Flow Refinement | `[payments]` `[frontend]` `[backend]` |
| P1 | TICKET-004: Role-Based Access Control Hardening | `[auth/roles]` `[backend]` `[frontend]` |
| P1 | TICKET-005: Basic Inbox Messaging System | `[messaging]` `[backend]` `[frontend]` |
| P1 | TICKET-014: Tiered Platform Subscription Plans | `[pricing]` `[backend]` `[frontend]` `[payments]` |
| P1 | TICKET-015: Studio Onboarding & Value-Demonstration Flow | `[onboarding]` `[frontend]` `[backend]` |
| P2 | TICKET-006: Resource & Gear Rental Module | `[resources]` `[booking]` `[backend]` `[frontend]` |
| P2 | TICKET-007: Studio Shop – Product Listings & Checkout | `[shop]` `[payments]` `[backend]` `[frontend]` |
| P2 | TICKET-008: Owner Analytics Dashboard | `[analytics]` `[frontend]` `[backend]` |
| P2 | TICKET-009: Email Marketing Automation | `[email-marketing]` `[backend]` `[frontend]` |
| Later | TICKET-010: Group Chat & Broadcast Messaging | `[messaging]` `[backend]` `[frontend]` |
| Later | TICKET-011: WebRTC Live / Video Layer | `[messaging]` `[backend]` `[frontend]` |
| Later | TICKET-012: Deeper Analytics Engine | `[analytics]` `[backend]` `[frontend]` |
| Later | TICKET-013: Niche-Specific Workflow Profiles | `[onboarding]` `[frontend]` `[backend]` |
