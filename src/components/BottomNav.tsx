import { Link, useLocation } from "@tanstack/react-router";
import { Home, List, PieChart, Wallet, CreditCard, Plus, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type NavTo = "/" | "/transactions" | "/accounts" | "/reports" | "/budgets" | "/bills";
const items: { to: NavTo; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/transactions", label: "Activity", icon: List },
  { to: "/accounts", label: "Accounts", icon: CreditCard },
  { to: "/reports", label: "Reports", icon: PieChart },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/bills", label: "Bills", icon: Receipt },
];

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <>
      {/* Floating add button */}
      <Link
        to="/add"
        search={{ type: undefined, scan: undefined }}
        aria-label="Add transaction"
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-50 size-[3.25rem] min-[380px]:size-14 rounded-full gradient-primary shadow-glow flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="size-5 min-[380px]:size-6 text-primary-foreground" strokeWidth={2.75} />
      </Link>

      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom pt-2 px-2 min-[380px]:px-3">
        <div className="glass-strong rounded-[1.5rem] min-[380px]:rounded-3xl shadow-elegant mx-auto w-full max-w-lg grid grid-cols-6 items-center h-[3.75rem] min-[380px]:h-16 px-1">
          {items.map((it) => (
            <NavItem
              key={it.to}
              to={it.to}
              label={it.label}
              icon={it.icon}
              active={isActive(path, it)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function isActive(path: string, it: { to: string; exact?: boolean }) {
  if (it.exact) return path === it.to;
  return path === it.to || path.startsWith(it.to + "/");
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: NavTo;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[1.125rem] min-[380px]:size-5 transition-transform",
          active && "scale-110",
        )}
        strokeWidth={active ? 2.5 : 2}
      />
      <span className="max-w-full truncate text-[9px] min-[380px]:text-[10px] font-medium tracking-wide">
        {label}
      </span>
    </Link>
  );
}
