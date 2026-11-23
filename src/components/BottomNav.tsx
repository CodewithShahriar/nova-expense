import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  BarChart2,
  Plus,
  Target,
  LayoutGrid,
  List,
  CreditCard,
  Receipt,
  CalendarDays,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = path === "/";
  const isReports = path === "/reports";
  const isBudgets = path === "/budgets";
  const isMenuSection =
    path === "/transactions" ||
    path.startsWith("/accounts") ||
    path === "/bills" ||
    path === "/events" ||
    path === "/review" ||
    path === "/settings";

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 px-3">
        <div className="glass-strong rounded-[2rem] min-[380px]:rounded-[2.2rem] shadow-elegant mx-auto w-full max-w-md md:max-w-xl h-[4.2rem] flex items-center justify-between px-3 md:px-5 relative border border-white/10">
          {/* 1. Home */}
          <Link
            to="/"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all select-none active:scale-95",
              isHome ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Home
              className={cn(
                "size-5 transition-transform",
                isHome ? "scale-110 stroke-[2.4]" : "stroke-[2]",
              )}
            />
            <span
              className={cn(
                "text-[10px] tracking-wide",
                isHome ? "font-bold text-primary" : "font-medium text-muted-foreground",
              )}
            >
              Home
            </span>
          </Link>

          {/* 2. Statistic */}
          <Link
            to="/reports"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all select-none active:scale-95",
              isReports ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BarChart2
              className={cn(
                "size-5 transition-transform",
                isReports ? "scale-110 stroke-[2.4]" : "stroke-[2]",
              )}
            />
            <span
              className={cn(
                "text-[10px] tracking-wide",
                isReports ? "font-bold text-primary" : "font-medium text-muted-foreground",
              )}
            >
              Statistic
            </span>
          </Link>

          {/* 3. Center Floating Neon Add (+) Button */}
          <div className="flex-1 flex justify-center -translate-y-4">
            <Link
              to="/add"
              search={{ type: undefined, scan: undefined, edit: undefined }}
              aria-label="Add transaction"
              className="size-13 rounded-full bg-primary text-zinc-950 shadow-glow flex items-center justify-center active:scale-95 transition-all hover:scale-105 border-4 border-[#0B0E14]"
            >
              <Plus className="size-6 stroke-[3]" />
            </Link>
          </div>

          {/* 4. Target / Budgets */}
          <Link
            to="/budgets"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all select-none active:scale-95",
              isBudgets ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Target
              className={cn(
                "size-5 transition-transform",
                isBudgets ? "scale-110 stroke-[2.4]" : "stroke-[2]",
              )}
            />
            <span
              className={cn(
                "text-[10px] tracking-wide",
                isBudgets ? "font-bold text-primary" : "font-medium text-muted-foreground",
              )}
            >
              Target
            </span>
          </Link>

          {/* 5. Menu Drawer Trigger */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all select-none active:scale-95 cursor-pointer",
                  isMenuSection ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid
                  className={cn(
                    "size-5 transition-transform",
                    isMenuSection ? "scale-110 stroke-[2.4]" : "stroke-[2]",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] tracking-wide",
                    isMenuSection ? "font-bold text-primary" : "font-medium text-muted-foreground",
                  )}
                >
                  Menu
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="glass-strong border-t border-white/15 rounded-t-[2.5rem] p-6 max-w-lg mx-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-foreground shadow-elegant"
            >
              <SheetHeader className="text-left pb-4 border-b border-white/10">
                <SheetTitle className="font-display text-lg font-bold text-foreground">
                  Navigation Menu
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-3 pt-5">
                <Link
                  to="/transactions"
                  onClick={() => setMenuOpen(false)}
                  className="glass rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition text-center"
                >
                  <div className="size-10 rounded-full glass flex items-center justify-center text-primary">
                    <List className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">Activity</span>
                </Link>

                <Link
                  to="/accounts"
                  onClick={() => setMenuOpen(false)}
                  className="glass rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition text-center"
                >
                  <div className="size-10 rounded-full glass flex items-center justify-center text-primary">
                    <CreditCard className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">Accounts</span>
                </Link>

                <Link
                  to="/bills"
                  onClick={() => setMenuOpen(false)}
                  className="glass rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition text-center"
                >
                  <div className="size-10 rounded-full glass flex items-center justify-center text-primary">
                    <Receipt className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">Bills</span>
                </Link>

                <Link
                  to="/events"
                  onClick={() => setMenuOpen(false)}
                  className="glass rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition text-center"
                >
                  <div className="size-10 rounded-full glass flex items-center justify-center text-primary">
                    <CalendarDays className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">Events</span>
                </Link>

                <Link
                  to="/review"
                  onClick={() => setMenuOpen(false)}
                  className="glass rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition text-center"
                >
                  <div className="size-10 rounded-full glass flex items-center justify-center text-primary">
                    <Sparkles className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">Review</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="glass rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition text-center"
                >
                  <div className="size-10 rounded-full glass flex items-center justify-center text-primary">
                    <SettingsIcon className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">Settings</span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
