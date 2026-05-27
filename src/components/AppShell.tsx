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

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (!event.deltaY || event.defaultPrevented) return;
      if (document.documentElement.dataset.scrollLock === "true") return;
      if (document.body.style.overflow === "hidden") return;
      if (hasScrollableParent(event.target)) return;
      if (!hasWheelTrapParent(event.target)) return;

      event.preventDefault();
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    }

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const hideNav = location.pathname === "/add";

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[60vh] z-0"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto w-full max-w-lg md:max-w-3xl xl:max-w-5xl pb-[calc(env(safe-area-inset-bottom)+8rem)]">
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
      <PwaInstallPrompt />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

function hasScrollableParent(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  let node: Element | null = target;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const canScrollY =
      /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;

    if (canScrollY) return true;
    node = node.parentElement;
  }

  return false;
}

function hasWheelTrapParent(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  let node: Element | null = target;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const isFixed = style.position === "fixed";
    const isHorizontalScroller =
      /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;

    if (isFixed || isHorizontalScroller) return true;
    node = node.parentElement;
  }

  return false;
}
