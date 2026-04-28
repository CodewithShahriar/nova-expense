import { Outlet, useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useEffect } from "react";
import { useStore } from "@/lib/storage";

export function AppShell() {
  const location = useLocation();
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [theme]);

  const hideNav = location.pathname === "/add";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[60vh] z-0"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="relative z-10 max-w-md mx-auto pb-36">
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
