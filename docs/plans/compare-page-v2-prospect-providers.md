# Compare Page v2 — Prospect Providers

**Created**: 2026-02-28
**Status**: Planning
**Motivation**: The current Compare page has a structural gap: it links "Add Provider" to the `/tariffs` page, which is designed to manage your *billing tariffs* (current and historical). A provider added there would be treated as a current tariff and pollute billing history. The concept of a **prospect provider** — one you are evaluating but have not switched to — does not exist in the system.

Additionally, switching costs (exit fee from current provider, switching bonus from a new provider) are currently global UI-only state. They need to be:
- **Exit fee**: per current tariff, stored in DB (it is a contractual property of your current plan)
- **Switching bonus**: per prospect provider, stored in DB (each provider may offer a different bonus)

---

## Core Design Decision

Extend `electricityTariffs` with a new role field to differentiate:

| Role | `isCurrent` | `isProspect` | Appears in | Used for billing |
|---|---|---|---|---|
| Historical | false | false | /tariffs page | No |
| Current | true | false | /tariffs + /compare | Yes (baseline) |
| **Prospect** | false | **true** | **/compare only** | **No** |

Switching costs stored on the tariff row:
- `switchingBonus` — on prospect tariffs: one-time credit the new provider offers
- `exitFee` — on the current tariff: one-time penalty to leave the current contract

---

## Architecture Overview

```
DB: electricityTariffs
  + isProspect: boolean (default false)
  + switchingBonus: real nullable   ← for prospect rows
  + exitFee: real nullable           ← for current tariff row

API:
  GET  /api/tariffs         → excludes isProspect=true (billing management)
  GET  /api/compare         → includes ALL (current + prospects), returns switchingBonus + exitFee
  POST /api/prospects       → create prospect tariff + periods (simplified)
  PATCH /api/prospects/[id] → update switchingBonus
  DELETE /api/prospects/[id]→ delete prospect

UI:
  /tariffs page             → unchanged, prospect tariffs hidden
  /compare page             → prospect form inline, per-provider switching costs
```

---

## GitHub Issues

### Issue 1 — Schema: Add `isProspect`, `switchingBonus`, `exitFee`
**Labels**: `db`, `backend`
**Blocks**: all other issues

Changes:
- `lib/db/schema.ts`: add three fields to `electricityTariffs`
  ```ts
  isProspect: integer('is_prospect', { mode: 'boolean' }).default(false),
  switchingBonus: real('switching_bonus'),   // one-time credit from new provider
  exitFee: real('exit_fee'),                  // one-time fee to leave current provider
  ```
- Create Drizzle migration: `npx drizzle-kit generate:sqlite`
- Apply migration

### Issue 2 — API: Filter prospect tariffs from `GET /api/tariffs`
**Labels**: `backend`
**Blocked by**: Issue 1

- In `app/api/tariffs/route.ts`, add `.where(eq(electricityTariffs.isProspect, false))` to the GET query
- Ensure POST creates `isProspect: false` by default (already implied, but make explicit)
- Prospect tariffs are not created via this endpoint

### Issue 3 — API: New prospect endpoints `POST/PATCH/DELETE /api/prospects`
**Labels**: `backend`
**Blocked by**: Issue 1

New file: `app/api/prospects/route.ts`
- `GET /api/prospects` — returns all prospect tariffs with their periods
- `POST /api/prospects` — body: `{ providerName, tariffName, exportRate, standingCharge?, periods[], switchingBonus? }`
  - Creates tariff with `isProspect: true, isCurrent: false`
  - Creates associated `tariffPeriods`

New file: `app/api/prospects/[id]/route.ts`
- `PATCH /api/prospects/[id]` — update `switchingBonus` only
- `DELETE /api/prospects/[id]` — delete tariff and its periods

### Issue 4 — API: Expose switching costs in `GET /api/compare`
**Labels**: `backend`
**Blocked by**: Issue 1

Changes to `app/api/compare/route.ts`:
- Include `isProspect`, `switchingBonus` in `TariffComparison` output
- Include `exitFee` from the current tariff row
- Return `exitFee` at top level in response (belongs to current tariff, affects all switching decisions)
- Response shape addition:
  ```ts
  interface CompareData {
    exitFee: number;         // from current tariff row (0 if none)
    comparisons: Array<TariffComparison & {
      isProspect: boolean;
      switchingBonus: number; // 0 if none
      ...
    }>;
  }
  ```

### Issue 5 — Compare Page: Inline ProspectForm component
**Labels**: `frontend`
**Blocked by**: Issue 3

New component: `components/compare/ProspectForm.tsx`
- A slide-up panel or inline form triggered by "Add Provider to Compare"
- Simplified fields (no billing dates, no PSO/VAT by default):
  - Provider name (text)
  - Tariff name (text)
  - Rate periods (reuse simplified period inputs — day rate, night rate at minimum)
  - Export rate
  - Standing charge (optional, labelled clearly)
  - Switching bonus (one-time credit from this provider)
- On submit: `POST /api/prospects`
- On success: refetch compare data

### Issue 6 — Compare Page: Replace global switching inputs with per-provider DB values
**Labels**: `frontend`
**Blocked by**: Issue 4, Issue 5

Changes to `app/compare/page.tsx`:
- Remove the global "Switching bonus" and "Exit fee" inputs added in v1
- Exit fee: read from `data.exitFee` (current tariff's DB field), shown editable inline near the current provider card or in a top-level info row
- Switching bonus: read from each prospect's `switchingBonus` field in the comparison data
- Pass `oneTimeAdjustment = switchingBonus - exitFee` to each non-current `ProviderCard`

Changes to `components/compare/ProviderCard.tsx`:
- For current provider: show editable `exitFee` input (saves via `PATCH /api/tariffs/[id]`)
- For prospect providers: show editable `switchingBonus` input (saves via `PATCH /api/prospects/[id]`)
- Both as inline currency inputs with immediate save (debounced or on-blur)

### Issue 7 — Compare Page: "Convert to Current" action on prospect cards
**Labels**: `frontend`, `backend`
**Blocked by**: Issue 6

When the user decides to switch to a prospect provider:
- Button on prospect `ProviderCard`: "Switch to this provider"
- Action: `POST /api/tariffs` (create a proper billing tariff) with the prospect's rates, marked as current
- Optionally: archive the old current tariff (set `validTo = today`)
- Optionally: delete or archive the prospect (mark `isProspect = false`)

This is a "graduation" flow: prospect → current tariff.

---

## File Dependency Map

```
lib/db/schema.ts                          ← Issue 1
  ↓
app/api/tariffs/route.ts                  ← Issue 2
app/api/prospects/route.ts                ← Issue 3 (new)
app/api/prospects/[id]/route.ts           ← Issue 3 (new)
app/api/compare/route.ts                  ← Issue 4
  ↓
components/compare/ProspectForm.tsx       ← Issue 5 (new)
components/compare/ProviderCard.tsx       ← Issue 6 (modify)
app/compare/page.tsx                      ← Issue 6 (modify)
  ↓
"Switch to this provider" action          ← Issue 7
```

---

## What NOT to Change

- The full `/tariffs` page and `TariffForm.tsx` — prospect providers have a simpler dedicated form
- `billCalc.ts` — prospect tariffs are already excluded from billing because they don't have `isCurrent: true`
- `compareCalc.ts` — logic is tariff-agnostic; prospect tariffs pass through it the same way
- Navigation — `/compare` route and bottom nav already exist

---

## Data Integrity Rules

1. Only one tariff may have `isCurrent = true` at a time (existing constraint)
2. `isProspect` and `isCurrent` are mutually exclusive — enforce in API
3. Deleting a prospect deletes its `tariffPeriods` rows (cascade)
4. `switchingBonus` and `exitFee` default to 0/null; null is treated as 0 in calculations

---

## Restart Prompt

See bottom of this document.
