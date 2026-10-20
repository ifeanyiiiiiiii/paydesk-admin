# PayDesk Admin

An open-source admin dashboard for a fictional payments platform: the operations console a fintech team uses to manage businesses, wallets, transactions, fees and admin access.

It's built to production standards with realistic generated data, so anyone can run it, read the code and try every feature. PayDesk isn't affiliated with any real company.

> 🚧 **In active development.** See the [roadmap](#roadmap) for progress.

## Tech stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **CI:** GitHub Actions (lint, type check, tests, build on every push)

More will be added as features land: shadcn/ui, TanStack Query and Table, Zustand, React Hook Form and Zod, Recharts, Playwright.

## Design decisions

### Money is always integer kobo

Every amount is stored and passed around as a whole number of kobo (₦1 = 100 kobo) using a branded `Kobo` type. Floats are never used for money, and conversion to naira happens only when displaying. This prevents floating-point errors (`0.1 + 0.2 !== 0.3`) and unit mix-ups that make dashboards show figures 100× too large. See [`src/lib/money.ts`](src/lib/money.ts) and its tests.

## Roadmap

- [x] Project setup, CI, money utilities with tests
- [ ] App shell, design system, demo login with roles
- [ ] Transactions: server-side pagination, URL-synced filters, search, detail drawer, CSV export
- [ ] Overview analytics with charts that drill down into filtered transactions
- [ ] Businesses and wallets: freeze/unfreeze, withdrawals with fee quotes
- [ ] Fee management, admin users and role-based permissions, audit log
- [ ] End-to-end tests, accessibility pass, screenshots

## Running locally

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests |
| `npm run typecheck` | Type-check the project |
| `npm run lint` | Lint the project |
| `npm run build` | Production build |

## License

MIT
