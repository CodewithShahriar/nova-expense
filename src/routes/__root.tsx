import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <p className="mt-3 text-muted-foreground">This page drifted off the ledger.</p>
        <a href="/" className="mt-6 inline-flex rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { name: "theme-color", content: "#0a0c10" },
      { title: "PocketLedger — Premium Expense Tracker" },
      { name: "description", content: "Beautifully simple expense tracking. Budgets, insights, and goals — all in your pocket." },
      { property: "og:title", content: "PocketLedger — Premium Expense Tracker" },
      { property: "og:description", content: "Beautifully simple expense tracking. Budgets, insights, and goals — all in your pocket." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: () => <AppShell />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
