# Restart Prompt — Compare Page v2: Feedback & Fixes

Paste this entire prompt to start a new session:

---

## Context

I am building a Next.js energy monitoring dashboard called Solar House (`/home/ignacio/dev/solar-house`). Read `CLAUDE.md` for the full architecture overview and `memory/MEMORY.md` for session notes.

## What was just built

Compare Page v2 — Prospect Providers is now complete (commit `416e6fa`). Read the full design doc at `docs/plans/compare-page-v2-prospect-providers.md`.

### What it does

The **Compare page** (`/app/compare/page.tsx`) fetches all tariffs (current + prospect) from the DB and runs cost calculations against real energy usage history, showing which provider would be cheapest for a selected period.

New in v2:
- **Prospect providers** — hypothetical providers you are evaluating, stored in the DB with `isProspect: true`. They appear on the compare page only, never in billing.
- **Inline ProspectForm** (`components/compare/ProspectForm.tsx`) — replaces the old "Add Provider" link that incorrectly went to `/tariffs`. Has fields: provider name, tariff name, dynamic rate periods (pre-filled Day/Night), export rate, standing charge, switching bonus.
- **Per-provider switching costs** — stored in DB, editable inline on each card:
  - `exitFee` on the current tariff (save via `PATCH /api/tariffs/[id]`)
  - `switchingBonus` per prospect (save via `PATCH /api/prospects/[id]`)
  - Both save on-blur; refetch compare data after save
- **"Switch to this provider"** button on prospect cards — fetches full prospect data, POSTs to `/api/tariffs` as `isCurrent: true`, deletes the prospect, refetches

### Key files

- `app/compare/page.tsx` — compare page, handleSwitch, ProspectForm toggle
- `components/compare/ProviderCard.tsx` — card with editable switching costs + switch button
- `components/compare/ProspectForm.tsx` — inline form for adding prospect providers
- `app/api/prospects/route.ts` — GET all / POST new prospect
- `app/api/prospects/[id]/route.ts` — PATCH (switchingBonus) / DELETE
- `app/api/tariffs/[id]/route.ts` — PATCH (exitFee)
- `app/api/compare/route.ts` — returns `exitFee` at top level + `isProspect`/`switchingBonus` per comparison
- `lib/db/schema.ts` — `electricityTariffs` now has `isProspect`, `switchingBonus`, `exitFee`

### Known pre-existing TypeScript errors (do not fix unless asked)

There are pre-existing TS errors in `app/charts/page.tsx`, `components/charts/PeriodSelector.tsx`, `components/charts/PowerAreaChart.tsx`, and `lib/myenergi/client.ts`. These cause `npm run build` to fail but are unrelated to the compare page.

## Your task

I have been using the compare page and have the following feedback:

[PASTE YOUR FEEDBACK HERE]

Work through each piece of feedback. For bugs, read the relevant files before changing anything. For UI tweaks, follow the existing dark-theme color conventions:
- Background cards: `bg-[#1E293B]`
- Dark inset: `bg-[#0F172A]`
- Accent amber: `#F59E0B`
- Green: `#10B981`
- Red: `#EF4444`
- Muted text: `text-[#94A3B8]`
