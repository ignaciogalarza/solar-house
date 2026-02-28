# Solar House — Claude Memory

## Project
Full-stack Next.js energy monitoring dashboard. CLAUDE.md has full architecture details.

## Stack
- Next.js 16 (App Router) + TypeScript
- Drizzle ORM + SQLite (`data/solar-house.db`)
- Tailwind CSS 4, shadcn/ui
- Vitest for tests

## Next.js 16 Notes
- Dynamic route `params` must be awaited: `{ params }: { params: Promise<{ id: string }> }` then `const { id } = await params;`
- Pre-existing TypeScript errors in `lib/myenergi/client.ts`, `charts/page.tsx`, `PowerAreaChart.tsx` — do not fix unless asked

## Database Migrations
- `npx drizzle-kit generate` then `npx drizzle-kit migrate`
- Check existing DB columns before applying — previous migrations may have been applied directly (pso_levy/vat_rate were added outside version control in 0000 migration)

## Compare Page v2 — Prospect Providers (completed 2026-02-28)
All 7 issues implemented:
- Schema: `isProspect`, `switchingBonus`, `exitFee` on `electricityTariffs`
- `GET /api/tariffs` filters out `isProspect=true`
- `POST/GET /api/prospects` + `PATCH/DELETE /api/prospects/[id]` — manage prospect tariffs
- `PATCH /api/tariffs/[id]` — update `exitFee` on current tariff
- `GET /api/compare` returns `exitFee` at top level + `isProspect`/`switchingBonus` per comparison
- `components/compare/ProspectForm.tsx` — inline form, replaces navigate-to-/tariffs
- `ProviderCard` — editable exitFee/switchingBonus inputs (save on blur), "Switch to this provider" button
- `compare/page.tsx` — no more global switching cost inputs; per-provider costs from DB

## Key File Locations
- Schema: `lib/db/schema.ts`
- Tariffs API: `app/api/tariffs/route.ts`, `app/api/tariffs/[id]/route.ts`
- Prospects API: `app/api/prospects/route.ts`, `app/api/prospects/[id]/route.ts`
- Compare API: `app/api/compare/route.ts`
- Compare page: `app/compare/page.tsx`
- Compare components: `components/compare/` (ProviderCard, ProspectForm, RateTable, SavingsBar, UsageSummary)
