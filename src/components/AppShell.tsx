import { Outlet, useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useEffect } from "react";
import { useStore } from "@/lib/storage";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { cn } from "@/lib/utils";

export function AppShell() {
  const location = useLocation();
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", theme === "light" ? "#f8fafc" : "#0b0e14");
    }
  }, [theme]);

  const hideNav = location.pathname === "/add";

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      {/* No color grading / glow at the top - clean solid dark background */}
      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-lg md:max-w-3xl xl:max-w-5xl",
          !hideNav && "pb-[calc(env(safe-area-inset-bottom)+8rem)]",
        )}
      >
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
      <PwaInstallPrompt />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
