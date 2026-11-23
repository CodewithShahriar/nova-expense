import { Outlet, useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useEffect } from "react";
import { useStore } from "@/lib/storage";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

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
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      {/* No color grading / glow at the top - clean solid dark background */}
      <div className="relative z-10 mx-auto w-full max-w-lg md:max-w-3xl xl:max-w-5xl pb-[calc(env(safe-area-inset-bottom)+8rem)]">
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
      <PwaInstallPrompt />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
