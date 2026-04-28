import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-7xl font-bold text-gradient">404</h1>
        <p className="mt-3 text-muted-foreground">This page drifted off the ledger.</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#0a0c10" },
      { title: "Nova Expense" },
      {
        name: "description",
        content: "Beautifully simple expense tracking with budgets, insights, and goals.",
      },
      { property: "og:title", content: "Nova Expense" },
      {
        property: "og:description",
        content: "Beautifully simple expense tracking with budgets, insights, and goals.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icon.svg" },
    ],
  }),
  component: AppShell,
  notFoundComponent: NotFoundComponent,
});
