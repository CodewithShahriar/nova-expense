# Nova Expense

Nova Expense is a premium mobile-first expense tracking web app built with React, TypeScript, Vite, TanStack Router, and Tailwind CSS. It brings accounts, transactions, budgets, bills, reports, and receipt scanning into a polished app-style interface.

## Features

- Mobile-first dashboard with account cards, weekly spending, savings rate, smart insight, bill reminders, and recent activity
- Account management with editable account name, account type, brand, number, balance, and card color
- Transaction flow for expenses, income, and transfers
- Receipt scanner with camera/upload support and OCR-assisted detail extraction
- Category picker with built-in and custom categories
- Budget tracking with category progress views
- Bills section with due-date reminders and status handling
- Reports with category breakdowns and income/expense charts
- Settings for appearance, currency, avatar, and app preferences
- Bottom navigation designed for fast mobile use
- PWA-ready setup with app manifest and quick shortcuts
- Toast notifications, dialogs, sheets, tabs, forms, and accessible controls
- SPA routing fallback support for production hosting

## Tech Stack

- React 19
- TypeScript
- Vite 7
- TanStack Router
- TanStack React Query
- Tailwind CSS 4
- Radix UI primitives
- Lucide React icons
- Recharts
- Tesseract.js
- Firebase SDK
- React Hook Form
- Zod
- date-fns
- Sonner
- Embla Carousel
- Vaul
- Prettier
- ESLint

## Main Routes

```text
/                Dashboard
/add             Add transaction
/accounts        Accounts list and editor
/accounts/$id    Account detail
/transactions    Transaction history
/budgets         Budget tracking
/bills           Bill reminders
/reports         Reports and charts
/settings        App settings
```

Routes live in `src/routes/` and are wired through TanStack Router with `src/router.tsx` and `src/routeTree.gen.ts`.

## Project Structure

```text
nova-expense/
|-- public/              Static assets, manifest, and SPA redirects
|-- src/
|   |-- components/      App components and reusable UI blocks
|   |-- components/ui/   Shared Radix-style UI primitives
|   |-- hooks/           Reusable React hooks
|   |-- lib/             App utilities, categories, bills, OCR, and sync helpers
|   |-- routes/          Route-level screens
|   |-- App.tsx          App wrapper
|   |-- main.tsx         React entry point
|   |-- router.tsx       Router configuration
|   |-- routeTree.gen.ts Generated TanStack route tree
|   `-- styles.css       Tailwind theme and global styles
|-- index.html
|-- vite.config.js
|-- tsconfig.json
|-- eslint.config.js
`-- package.json
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

Open the local app:

```text
http://localhost:5173
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

Format files:

```bash
npm run format
```

## Scripts

- `npm run dev` starts the Vite development server
- `npm run build` creates a production build
- `npm run build:dev` creates a development-mode build
- `npm run preview` previews the production build
- `npm run lint` runs ESLint checks
- `npm run format` formats files with Prettier

## UI Approach

Nova Expense uses a dark glassmorphism interface with rounded cards, gradient accents, smooth mobile interactions, safe-area spacing, and compact controls. Tailwind CSS handles the visual system, while Radix UI primitives support accessible overlays, menus, tabs, forms, tooltips, and selection controls.

## Build And Deployment

Vite powers local development and production builds. The app is ready for static hosting and includes SPA fallback configuration through `public/_redirects` plus Vercel configuration in `vercel.json`.
