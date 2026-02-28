# Restart Prompt — Compare Page v2: Feedback & Fixes (Round 2)

Paste this entire prompt to start a new session:

---

## Context

I am building a Next.js energy monitoring dashboard called Solar House (`/home/ignacio/dev/solar-house`). Read `CLAUDE.md` for the full architecture overview.

## What was built (most recent commit: `830c2e7`)

Compare Page v2 — Prospect Providers, with three feedback fixes applied:

### 1. Cents input in ProspectForm
All rate fields (import periods, export rate, standing charge) now accept user input in **cents** (e.g. `19.5` c/kWh). The form converts to euros internally before storing in the DB. The switching bonus remains in euros (flat amount). Labels show `c/kWh` and `c/day`.

### 2. Rate display in RateTable
Rates are now shown as cents: `19.50c` instead of `€0.1950`. Column headers updated to `Day (c)`, `Night (c)`, `Export (c)`.

### 3. Edit prospect after creation
Prospect ProviderCards now have a pencil-icon **Edit** button next to the "Prospect" badge. Clicking it fetches the full prospect data from `GET /api/prospects` and opens `ProspectForm` pre-filled in edit mode. Saving calls `PATCH /api/prospects/[id]` (now supports full updates: all fields + periods). `compare/page.tsx` manages `editingProspect` state for this flow.

### Key files (all modified in 830c2e7)

- `components/compare/ProspectForm.tsx` — cents input, edit mode support
- `components/compare/RateTable.tsx` — cents display
- `components/compare/ProviderCard.tsx` — edit button + `onEdit` prop
- `app/compare/page.tsx` — `editingProspect` state, `handleEditProspect`
- `app/api/prospects/[id]/route.ts` — extended PATCH for full updates

### Pre-existing TypeScript errors (do not fix unless asked)

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

Create a GitHub issue for the feedback items, use the lowest capable model (haiku) where appropriate, commit changes at the end, and produce an updated version of this file for the next feedback round.
