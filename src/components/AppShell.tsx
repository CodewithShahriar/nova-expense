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
    <div className="min-h-[100dvh] w-full bg-[#080a0f] text-foreground flex justify-center">
      {/* Centered mobile device frame on desktop, full width on mobile */}
      <div
        className={cn(
          "relative z-10 w-full max-w-[430px] min-h-[100dvh] bg-background sm:border-x sm:border-white/10 sm:shadow-[0_0_60px_-15px_rgba(0,0,0,0.9)] flex flex-col",
          !hideNav && "pb-[calc(env(safe-area-inset-bottom)+7.5rem)]",
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
