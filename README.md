# Pilates Studio App

Monorepo containing:

- `api/`: Rails 8 GraphQL API (PostgreSQL)
- `web/`: React + Vite frontend

## Prerequisites

- Ruby (see `api/.ruby-version`)
- Bundler (`gem install bundler` if needed)
- Node.js + npm
- PostgreSQL running locally

Optional (but nice): a Procfile process manager.

- macOS: `brew install overmind` (requires `tmux`)
- Alternative: `gem install foreman`

If you don’t have either installed, `./dev` will still work (it falls back to running both servers in the background).

## One-time setup

### 1) Backend (Rails API)

From the repo root:

```bash
cd api
bundle install
bin/rails db:prepare
```

Notes:

- `db:prepare` will create the DB (if needed), run migrations, and seed development data.
- For a clean slate (destructive):

```bash
cd api
bin/setup --reset --skip-server
```

### 2) Frontend (React/Vite)

```bash
cd web
npm install
```

## Run the app (development)

From the repo root:

```bash
./dev
```

This runs `Procfile.dev`:

- API: http://localhost:3000
- Web: http://localhost:5173

Helpful dev endpoints:

- GraphQL endpoint: http://localhost:3000/graphql
- GraphiQL (dev only): http://localhost:3000/graphiql
- GraphQL Voyager (dev only): http://localhost:3000/voyager

## Seeded demo accounts (development)

After seeding, you can sign in with:

- Owner: `owner@studio.example.com`
- Staff: `staff@studio.example.com`
- Password: `password`

You can override seed credentials via env vars:

- API seeds: `SEED_OWNER_EMAIL`, `SEED_STAFF_EMAIL`, `SEED_SECONDARY_OWNER_EMAIL` (optional), `SEED_PASSWORD`
- Web dev helper UI: `VITE_SEED_OWNER_EMAIL`, `VITE_SEED_STAFF_EMAIL`, `VITE_SEED_SECONDARY_OWNER_EMAIL`, `VITE_SEED_PASSWORD`

## Environment variables

### API (`api/.env`)

The API will load simple `KEY=value` pairs from `api/.env` in development/test.

Common ones:

- `WEB_APP_URL` (defaults to `http://localhost:5173`)
- Stripe (optional): `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Stripe Connect (optional): `STRIPE_CONNECT_COUNTRY`, `STRIPE_CONNECT_REFRESH_URL`, `STRIPE_CONNECT_RETURN_URL`
- Google sign-in (optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### Web (`web/.env`)

Vite exposes variables prefixed with `VITE_` to the frontend.

Common ones:

- `VITE_GOOGLE_CLIENT_ID`
- Seed overrides: `VITE_SEED_*` (see above)

## Tests + lint

### Backend

```bash
cd api
bundle exec rspec
```

### Frontend

```bash
cd web
npm run lint
npm test
```

## Git hooks (optional)

This repo includes an optional Git hook that inserts a metadata line into commit messages with your local timestamp and Git user name.

- Enable hooks for this repo: `./bin/setup-githooks`
- Bypass for a single commit: `SKIP_COMMIT_META=1 git commit ...`

## Troubleshooting

- **Ports in use**: the dev servers expect `3000` (API) and `5173` (web). Stop anything else using those ports.
- **Rails “server already running”**: remove a stale pid file:

```bash
cd api
rm -f tmp/pids/server.pid
```

## Notification system

Studio owners receive **in-app notifications** (bell icon in the header) and, for subscription events, **email notifications** via `SubscriptionMailer`.

### Architecture

| Layer             | File(s)                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| Model             | `api/app/models/notification.rb`                                          |
| Job               | `api/app/jobs/notification_job.rb`                                        |
| Mailer            | `api/app/mailers/subscription_mailer.rb`                                  |
| GraphQL type      | `api/app/graphql/types/notification_type.rb`                              |
| GraphQL queries   | `myNotifications`, `myUnreadNotificationCount` in `query_type.rb`         |
| GraphQL mutations | `markNotificationRead`, `markAllNotificationsRead`, `dismissNotification` |
| Webhook wiring    | `api/app/controllers/platform_webhooks_controller.rb`                     |
| Scheduled tasks   | `api/lib/tasks/notifications.rake`                                        |
| Frontend bell     | `web/src/components/NotificationBell.jsx`                                 |
| Frontend banner   | `web/src/components/SubscriptionStatusBanner.jsx`                         |

The frontend panel is rendered via React portal (`document.body`) so it is never clipped by `overflow-hidden` ancestors.

---

### Notification kinds and triggers

#### Subscription (fired automatically via Stripe webhooks or rake tasks)

| Kind                             | Trigger                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `subscription_trial_ending`      | Daily rake task — when a trial ends in ≤ 3 days                                       |
| `subscription_trial_expired`     | Daily rake task — when a trial period has passed (also downgrades to Starter)         |
| `subscription_past_due`          | Daily rake task — in-app reminder every 24 h while status is `past_due`               |
| `subscription_payment_failed`    | Stripe `invoice.payment_failed` webhook                                               |
| `subscription_payment_succeeded` | Stripe `invoice.paid` webhook                                                         |
| `subscription_cancelled`         | Stripe `customer.subscription.deleted` or `customer.subscription.updated` → cancelled |
| `subscription_reactivated`       | Available; fire manually via `NotificationJob.perform_later`                          |
| `subscription_upgraded`          | Available; fire manually via `NotificationJob.perform_later`                          |
| `subscription_downgraded`        | Available; fire manually via `NotificationJob.perform_later`                          |

#### Booking (fired inline from GraphQL mutations)

| Kind                | Trigger                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `booking_confirmed` | `CreateBooking` mutation — notifies owners when a client books a spot                                        |
| `booking_cancelled` | `CancelBooking` mutation — notifies owners when a booking is cancelled                                       |
| `waitlist_promoted` | Available; `CancelBooking` already fires the client email; in-app owner notification can be added if desired |

#### Class & scheduling

| Kind             | Trigger                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `class_reminder` | Daily rake task `notifications:class_reminders` — classes starting in the next 24 h with ≥ 1 booking |

#### Client & membership

| Kind                      | Trigger                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `new_client_joined`       | `SignUp` mutation — when a client completes account creation            |
| `membership_expiring`     | Available; add a rake task or callback when a membership is near expiry |
| `instructor_payout_ready` | Available; fire from the payout calculation flow                        |
| `studio_milestone`        | Available; fire from any place that tracks business milestones          |

#### General

| Kind      | Trigger                                                                            |
| --------- | ---------------------------------------------------------------------------------- |
| `general` | Fire ad-hoc: `Notification.notify_owners(studio:, kind: "general", title:, body:)` |

---

### Firing notifications manually

**In-app only (no email):**

```ruby
Notification.notify_owners(
  studio:     studio,
  kind:       "general",         # any valid kind
  title:      "Something happened",
  body:       "Here is more detail.",
  action_url: "/some/path"       # optional — navigated to on click
)
```

`notify_owners` is idempotent — it uses `find_or_create_by!(user, studio, kind, title)` so calling it twice with the same arguments is safe.

**With email (subscription events):**

```ruby
NotificationJob.perform_later("subscription_payment_failed", studio_subscription.id)
```

The job creates the in-app notification and sends an email to every owner on the account.

---

### Rake tasks (schedule daily via Heroku Scheduler or cron)

```bash
# Subscription reminders: trial_ending, trial_expired (also downgrades), past_due reminders
rails notifications:subscription_reminders

# Class reminders: upcoming classes in the next 24 h with active bookings
rails notifications:class_reminders
```

---

### Frontend components

**`NotificationBell`** — drop into any authenticated header. Polls the unread count every 60 s, loads the list lazily when opened, supports mark-read and dismiss per item, and "Mark all read".

**`SubscriptionStatusBanner`** — renders a dismissible banner at the top of the app when the subscription is `past_due`, `cancelled`, or a trial is ending within 3 days.

---

## More docs

- Backend details: `api/README.md`
