# API (Rails)

## Local setup

From `api/`:

- Install gems: `bundle install`
- Prepare the DB (create + migrate + seed if needed): `bin/rails db:prepare`

Or use the helper:

- `bin/setup`

## Reset local database (clean slate)

This is destructive (drops and recreates your local DB):

- `bin/setup --reset`

## Seeded demo accounts

Seeds are intended for development only (they do not run in production).

Defaults:

- Owner: `owner@studio.example.com`
- Staff: `staff@studio.example.com`
- Password: `password`

You can override these via env vars:

- `SEED_OWNER_EMAIL`
- `SEED_STAFF_EMAIL`
- `SEED_SECONDARY_OWNER_EMAIL` (optional)
- `SEED_PASSWORD`
