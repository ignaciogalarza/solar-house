# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)

# Building & Deployment
npm run build            # Build for production
npm start                # Run production server

# Code Quality
npm run lint             # Run ESLint on all files
npm run lint -- --fix    # Auto-fix linting issues

# Testing
npm test                 # Run all tests (Vitest)
npm test -- --watch      # Run tests in watch mode
npm test RatePreview     # Run tests for a specific file
npm test -- --ui         # Run tests with UI dashboard

# Database
npx drizzle-kit generate:sqlite     # Generate migration files
npx drizzle-kit migrate:sqlite      # Run pending migrations
npx drizzle-kit studio              # Open interactive DB studio

# shadcn/ui Components
npx shadcn@latest add [component]   # Add a new UI component
```

## Architecture Overview

The Solar House is a full-stack Next.js energy monitoring dashboard that displays real-time solar generation, grid import/export, EV charging status, and calculates bills based on time-of-use tariffs.

### Layered Architecture

```
UI Layer (React/TypeScript)
    ↓
API Routes (Next.js handlers)
    ↓
Service Layer (Business logic)
    ↓
Database Layer (Drizzle ORM) + External APIs (MyEnergi)
```

### Key Directories

- **/app** - Next.js App Router pages and API routes
  - `/api/energy/*` - Energy data endpoints (current, today, historical)
  - `/api/tariffs/*` - Tariff management CRUD
  - `/api/migrate` - Database migration endpoints
  - `/charts`, `/tariffs` - Page routes

- **/components** - React components organized by feature
  - `/dashboard` - Power gauge, energy flow, device cards
  - `/charts` - Charts and visualizations (power, energy, consumption)
  - `/tariffs` - Tariff forms, rate preview, history
  - `/ui` - shadcn/ui primitive components (Button, Input, etc.)
  - `/navigation` - Header and bottom nav

- **/lib** - Core business logic
  - `/db` - Drizzle schema, migrations, database client
  - `/services` - EnergyService (MyEnergi API calls, caching, persistence)
  - `/myenergi` - MyEnergi HTTP client and API type definitions
  - `/utils` - Bill calculation and utility functions

- **/data** - Local SQLite database file

## Data Flow & Key Patterns

### Real-Time Energy Data Flow

1. **Client** polls `/api/energy/current` every 10 seconds (via React hook)
2. **API Route** calls `EnergyService.getCurrentStatus()`
3. **Service Layer** checks `DailyTotalsCache` (2-min TTL)
4. If cache miss:
   - Calls MyEnergi API to fetch Zappi, Eddi, Harvi device status
   - Stores reading in SQLite `energy_readings` table
   - Updates cache
5. Returns structured energy data to client

### Bill Calculation Flow

1. User defines tariffs with time-of-use periods and rates
2. Rate periods stored in database with day-of-week and time ranges
3. When viewing bills, `billCalc.ts` matches readings to applicable rates
4. Calculates costs per import/export/generation

### Key Type Definitions

- **MyEnergi Device Types** (`lib/myenergi/types.ts`):
  - `ZappiStatus` - EV charger state, charge modes (Fast, Eco, Paused)
  - `EddiStatus` - Hot water diverter state, boost mode
  - `HarviReading` - Solar generation and grid measurements

- **Energy Data Structure** (`app/api/energy/route.ts`):
  - Returns `{ power, energy, timestamp, devices, mock? }`
  - Mock data available when MyEnergi credentials missing (dev mode)

## Development Workflow

### Adding a New Feature

1. **Create component** in `/components/[feature]/`
2. **Add API route** in `/app/api/[feature]/` if data needed
3. **Extend service** in `/lib/services/` for business logic
4. **Update database** if new data storage needed:
   - Modify schema in `lib/db/schema.ts`
   - Run `npx drizzle-kit generate:sqlite` to create migration
   - Run migration or use `/api/migrate` endpoint

### Database Modifications

Always use migrations:
```bash
# After changing lib/db/schema.ts
npx drizzle-kit generate:sqlite

# Apply migration
npx drizzle-kit migrate:sqlite
```

Do NOT directly modify database manually - keep migrations in version control.

### Component Testing

Test complex visualizations with React Testing Library:
```bash
# Example: testing rate preview calculations
npm test RatePreview -- --watch
```

## Important Implementation Details

### MyEnergi API Integration

- **Authentication**: Digest auth via `MYENERGI_USERNAME` and `MYENERGI_PASSWORD` env vars
- **Client Location**: `lib/myenergi/client.ts` (handles HTTP requests and auth)
- **Endpoints**: Zappi, Eddi, Harvi device endpoints with polling
- **Fallback**: Serves mock data when credentials unavailable (development)

### Caching Strategy

- `DailyTotalsCache` in `lib/services/historyCache.ts` caches daily totals for 2 minutes
- Reduces API calls and improves performance
- Automatically invalidates per day

### Styling & Theme

- **Tailwind CSS 4** with CSS variables for dark theme
- **Colors**: Deep blue background (#0F172A), light text (#F8FAFC)
- **Components**: shadcn/ui provides styled primitives (Button, Input, Card)
- **Responsive**: Mobile-first design with `max-w-lg` container

### Type Safety

- Strict TypeScript configuration enforced
- Device enums (`ZappiChargeMode`, `EddiMode`) for type-safe control
- All API responses typed with interfaces

## Common Tasks

### View Active Tests
```bash
npm test -- --ui
# Opens interactive test dashboard
```

### Add a UI Component from shadcn
```bash
npx shadcn@latest add checkbox
# Automatically adds to /components/ui/checkbox.tsx
```

### Debug Database
```bash
npx drizzle-kit studio
# Opens interactive database browser
```

### Profile Performance
- Use React DevTools Profiler tab
- Check cache hit rate in `EnergyService` logs
- Monitor MyEnergi API response times

## Environment Setup

Create `.env.local` with:
```
MYENERGI_USERNAME=your_username
MYENERGI_PASSWORD=your_password
```

Without these, the app runs in mock mode (useful for UI development without API access).

## Code Organization Conventions

- **Barrel Exports**: Use `index.ts` in component folders to re-export
- **Path Aliases**: Use `@/` prefix for all imports (e.g., `@/lib/services`)
- **Feature Folders**: Group related components/pages by feature
- **Service Methods**: Keep API calls and caching logic in `EnergyService`
- **Type Definitions**: Central location in `lib/myenergi/types.ts` for device types

## Testing Notes

- Framework: Vitest (faster Jest alternative)
- Testing library: React Testing Library for components
- DOM environment: JSDOM
- Limited coverage currently - focus on complex visualizations and calculations
- Test files: `*.test.tsx` files alongside components
