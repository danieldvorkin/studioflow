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

## More docs

- Backend details: `api/README.md`

