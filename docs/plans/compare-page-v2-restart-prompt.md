# Restart Prompt — Compare Page v2: Prospect Providers

Paste this entire prompt to start a new session:

---

## Context

I am building a Next.js energy monitoring dashboard called Solar House (`/home/ignacio/dev/solar-house`). Read `CLAUDE.md` for the full architecture overview.

## What is already built

- A **Compare page** (`/app/compare/page.tsx`) that fetches all tariffs from the DB and runs cost calculations against real energy usage history, showing which provider would have been cheapest for a selected period (week/month/year).
- A **Tariffs page** (`/app/tariffs`) for managing current and historical electricity tariffs used for bill calculation.
- A **database** (`lib/db/schema.ts`) using Drizzle ORM with SQLite, containing `electricityTariffs` and `tariffPeriods` tables.

## The gap we identified

The Compare page has a structural flaw: the "Add Provider to Compare" button navigates to `/tariffs` (the billing management page), which is wrong because:

1. A provider added there gets treated as a **current tariff**, mixing it into billing history.
2. There is no concept of a **prospect provider** — a hypothetical provider you are evaluating but have not switched to.
3. **Switching costs** (exit fee from current provider, joining bonus from a new provider) are currently global UI-only state. They need to be stored **per-provider** in the DB.

## The plan

Full design document: `docs/plans/compare-page-v2-prospect-providers.md`

GitHub issues to implement (in order):
- **#15** — Schema: Add `isProspect`, `switchingBonus`, `exitFee` to `electricityTariffs`
- **#16** — API: Filter prospect tariffs from `GET /api/tariffs`
- **#17** — API: New endpoints `POST/PATCH/DELETE /api/prospects`
- **#18** — API: Expose `switchingBonus` and `exitFee` in `GET /api/compare`
- **#19** — Compare page: Inline `ProspectForm` component (replaces navigate-to-/tariffs flow)
- **#20** — Compare page: Per-provider switching costs from DB, remove global inputs
- **#21** — Compare page: "Switch to this provider" action (graduate prospect to current)

## Current state of switching cost inputs

In the *previous* session, I added global `switchingCredit` and `exitPenalty` inputs to the compare page as a stopgap. These will be **removed and replaced** by Issue #20 once the DB-backed per-provider values are in place. The current implementation is in:
- `app/compare/page.tsx` (state + UI panel)
- `components/compare/ProviderCard.tsx` (`oneTimeAdjustment` prop)

## Your task

Work through the GitHub issues in order, starting with **#15**. Read the plan doc first, then tackle each issue. Mark each GitHub issue as closed when done.

Key files to read before starting:
- `docs/plans/compare-page-v2-prospect-providers.md`
- `lib/db/schema.ts`
- `app/api/tariffs/route.ts`
- `app/api/compare/route.ts`
- `app/compare/page.tsx`
- `components/compare/ProviderCard.tsx`
