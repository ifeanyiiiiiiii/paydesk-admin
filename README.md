# PayDesk Admin

An open-source admin dashboard for a fictional payments platform: the operations console a fintech team uses to manage businesses, wallets, transactions, fees and admin access.

It's built to production standards with realistic generated data, so anyone can run it, read the code and try every feature. PayDesk isn't affiliated with any real company.

**Live demo:** https://paydesk-admin-omega.vercel.app

> 🚧 **In active development.** See the [roadmap](#roadmap) for progress.

## Tech stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Auth:** encrypted cookie sessions (iron-session), role-based permissions
- **Testing:** Vitest
- **CI:** GitHub Actions (lint, type check, tests, build on every push)

More will be added as features land: TanStack Query and Table, Zustand, React Hook Form and Zod, Recharts, Playwright.

## Design decisions

### Money is always integer kobo

Every amount is stored and passed around as a whole number of kobo (₦1 = 100 kobo) using a branded `Kobo` type. Floats are never used for money, and conversion to naira happens only when displaying. This prevents floating-point errors (`0.1 + 0.2 !== 0.3`) and unit mix-ups that make dashboards show figures 100× too large. See [`src/lib/money.ts`](src/lib/money.ts) and its tests.

### Authentication and permissions

The demo has three fictional accounts, one per role. Pick one on the login page, no password needed.

| Role | Can do |
|---|---|
| Super admin | Everything, including fee rules and admin accounts |
| Operations | Day-to-day operations: freeze wallets, approve withdrawals, export transactions |
| Viewer | Read-only access to transactions, businesses and wallets |

How it works:

- **Session:** an encrypted, httpOnly cookie that holds only the user ID and expires after 8 hours. See [`src/lib/auth/session.ts`](src/lib/auth/session.ts).
- **Permissions, not roles, in checks:** code asks `can(role, "wallets:freeze")` rather than "is this a super admin?", so a role's abilities live in one tested map. See [`src/lib/auth/permissions.ts`](src/lib/auth/permissions.ts).
- **Two layers of checks:** [`src/proxy.ts`](src/proxy.ts) quickly sends visitors without a session cookie to the login page, and the data access layer ([`src/lib/auth/dal.ts`](src/lib/auth/dal.ts)) does the real check on the server for every protected page. Hiding a sidebar link is never the only thing keeping someone out.
- **Safe redirects:** after login you return to the page you asked for, but only same-site paths are allowed, so a crafted link can't send you to another site.

## Roadmap

- [x] Project setup, CI, money utilities with tests
- [x] App shell: sidebar navigation, header, light/dark theme
- [x] Demo login with roles and permission checks
- [ ] Transactions: server-side pagination, URL-synced filters, search, detail drawer, CSV export
- [ ] Overview analytics with charts that drill down into filtered transactions
- [ ] Businesses and wallets: freeze/unfreeze, withdrawals with fee quotes
- [ ] Fee management, admin users and role-based permissions, audit log
- [ ] End-to-end tests, accessibility pass, screenshots

## Running locally

Requires Node.js 22.

```bash
npm install
cp .env.example .env.local   # then set SESSION_PASSWORD (32+ characters)
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
