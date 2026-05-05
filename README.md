# Nova Expense

Nova Expense is a mobile-first expense tracking web app built with Vite, React, TypeScript, TanStack Router, and Tailwind CSS. It helps track accounts, transactions, budgets, reports, and app settings locally in the browser.

## Features

- Dashboard with account cards, weekly spending, savings rate, insights, and recent activity
- Account management with editable account name, type, brand, number, balance, and card color
- Transaction entry for expenses, income, and transfers
- Category picker with built-in and custom categories
- Budget tracking by category with monthly progress
- Reports with category breakdowns and six-month income/expense charts
- Settings for profile name, avatar, theme, CSV export, and transaction cleanup
- Firebase email/password login with Firestore sync across devices
- Local-first data storage using `localStorage` when signed out
- Mobile-friendly layout with bottom navigation
- SPA routing with fallback redirects for direct route reloads

## Tech Stack

- React 19
- TypeScript
- Vite 7
- TanStack Router
- Tailwind CSS 4
- Radix UI primitives
- Lucide React icons
- Recharts
- date-fns
- Firebase

## Project Structure

```text
nova-expense/
├─ index.html
├─ public/
│  ├─ _redirects
│  ├─ brac.png
│  ├─ asia.png
│  ├─ icon.svg
│  └─ manifest.webmanifest
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ router.tsx
│  ├─ routeTree.gen.ts
│  ├─ styles.css
│  ├─ components/
│  ├─ hooks/
│  ├─ lib/
│  └─ routes/
├─ vite.config.js
├─ tsconfig.json
├─ eslint.config.js
└─ package.json
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

On Windows PowerShell, if `npm` is blocked by execution policy, use:

```powershell
npm.cmd run dev
```

## Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Build production assets
npm run build:dev  # Build in development mode
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Format files with Prettier
```

The Vite scripts use `--configLoader native` to avoid config-loading issues on some Windows environments.

## Routes

- `/` - Dashboard
- `/add` - Add transaction
- `/accounts` - Accounts list and account editing
- `/accounts/$id` - Account detail
- `/transactions` - Transaction history
- `/budgets` - Budget tracking
- `/reports` - Reports and charts
- `/settings` - Profile, theme, export, and data actions

Routes are defined in `src/routes/` and wired through TanStack Router via `src/router.tsx` and `src/routeTree.gen.ts`.

## Data Storage

When signed out, app data is stored in browser `localStorage` under the key:

```text
pocketledger:v2
```



## Styling

Global styling and Tailwind theme tokens live in:

```text
src/styles.css
```

## Deployment

This is a client-side Vite app. Build it with:

```bash
npm run build
```

The production output will be generated in:

```text
dist/
```

For static hosts such as Netlify, Cloudflare Pages, or similar, make sure SPA fallback routing is enabled. This repo includes:

```text
public/_redirects
```

with:

```text
/* /index.html 200
```

That lets direct visits like `/accounts` or `/reports` load the app correctly.
