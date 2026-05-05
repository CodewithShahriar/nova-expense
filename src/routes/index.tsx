import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import {
  ArrowLeftRight,
  Bell,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  TrendingDown,
  User,
} from "lucide-react";
import { useStore, store, formatMoney } from "@/lib/storage";
import { GlassCard } from "@/components/GlassCard";
import { AccountCard } from "@/components/AccountCard";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { billRuntimeStatus, billTimingLabel, formatDueDate } from "@/lib/bills";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const bills = useStore((s) => s.bills);
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customCategories);
  const currency = settings.currency;
  const scroller = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let weekSpent = 0,
      monthIncome = 0,
      monthExpense = 0;
    for (const t of transactions) {
      const d = new Date(t.date);
      if (t.type === "expense" && d >= weekStart) weekSpent += t.amount;
      if (d >= monthStart) {
        if (t.type === "income") monthIncome += t.amount;
        else if (t.type === "expense") monthExpense += t.amount;
      }
    }
    const savingsRate =
      monthIncome > 0 ? Math.max(0, Math.min(1, (monthIncome - monthExpense) / monthIncome)) : 0;
    return { weekSpent, monthIncome, monthExpense, savingsRate };
  }, [transactions]);

  const recent = transactions.slice(0, 5);
  const reminderBills = useMemo(
    () =>
      bills
        .filter((bill) => billRuntimeStatus(bill) !== "paid")
        .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
        .slice(0, 2),
    [bills],
  );

  const insight = useMemo(() => {
    if (transactions.length === 0) return "Add your first transaction to unlock insights.";
    if (stats.monthExpense === 0) return "No expenses this month yet. You're off to a clean start.";
    const ratio = stats.monthIncome > 0 ? stats.monthExpense / stats.monthIncome : 1;
    if (ratio < 0.5) return "You're spending under 50% of income — excellent control this month.";
    if (ratio < 0.8) return "Spending is healthy. Keep an eye on discretionary categories.";
    return "Spending is outpacing income this month. Review your top category.";
  }, [stats, transactions.length]);

  const initials = (settings.name || "You")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      {/* Top bar with avatar */}
      <div className="flex items-center justify-between mb-5 px-4 min-[380px]:px-5">
        <Link to="/settings" className="flex items-center gap-3 active:scale-[0.98] transition">
          {settings.avatar ? (
            <img
              src={settings.avatar}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-primary/40"
            />
          ) : (
            <div className="size-11 rounded-full gradient-primary flex items-center justify-center ring-2 ring-primary/40">
              <span className="text-primary-foreground text-sm font-bold">
                {initials || <User className="size-5" />}
              </span>
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Welcome back
            </p>
            <p className="text-sm font-semibold mt-0.5 truncate max-w-[180px]">
              {settings.name || "You"}
            </p>
          </div>
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          className="size-10 rounded-full glass flex items-center justify-center active:scale-95"
        >
          <SettingsIcon className="size-4" />
        </Link>
      </div>

      {/* Account carousel */}
      <div className="relative">
        <div
          ref={scroller}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 min-[380px]:px-5 pb-1"
        >
          {accounts.map((a) => (
            <div key={a.id} className="snap-center shrink-0 w-[92%] min-[380px]:w-[88%]">
              <Link to="/accounts/$id" params={{ id: a.id }}>
                <AccountCard account={a} currency={currency} />
              </Link>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="w-full">
              <GlassCard className="text-center py-8">
                <p className="text-sm text-muted-foreground">No accounts yet</p>
                <Link
                  to="/accounts"
                  className="mt-3 inline-flex rounded-full gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Add account
                </Link>
              </GlassCard>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 min-[380px]:px-5">
        {/* Week + Savings */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 mt-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <TrendingDown className="size-4" />
              <span className="text-[11px] uppercase tracking-widest font-medium">
                Spent this week
              </span>
            </div>
            <p className="mt-2 truncate font-display text-xl min-[380px]:text-2xl font-bold tabular">
              {formatMoney(stats.weekSpent, currency, true)}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-primary">
              <Target className="size-4" />
              <span className="text-[11px] uppercase tracking-widest font-medium">
                Savings rate
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tabular">
              {Math.round(stats.savingsRate * 100)}%
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-700"
                style={{ width: `${stats.savingsRate * 100}%` }}
              />
            </div>
          </GlassCard>
        </div>

        {/* Insight */}
        <GlassCard className="mt-3 p-4 flex gap-3 items-start">
          <div className="size-9 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Smart insight</p>
            <p className="text-sm text-muted-foreground mt-0.5">{insight}</p>
            {transactions.length === 0 && (
              <button
                onClick={() => store.seedDemo()}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Load sample data →
              </button>
            )}
          </div>
        </GlassCard>

        {reminderBills.length > 0 && (
          <GlassCard className="mt-3 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15">
                  <Bell className="size-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">Bill reminders</p>
              </div>
              <Link to="/bills" className="text-xs font-medium text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {reminderBills.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 rounded-2xl bg-muted/35 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{bill.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {billTimingLabel(bill)} · {formatDueDate(bill.dueDate)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 font-display text-sm font-semibold tabular",
                      billRuntimeStatus(bill) === "overdue" ? "text-destructive" : "text-primary",
                    )}
                  >
                    {formatMoney(bill.amount, currency, true)}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Recent */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link to="/transactions" className="text-xs text-primary font-medium">
            See all
          </Link>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && (
            <GlassCard className="text-center py-8">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <Link
                to="/add"
                className="mt-3 inline-flex rounded-full gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Add your first
              </Link>
            </GlassCard>
          )}
          {recent.map((t) => {
            const cat = getCategory(t.category, custom);
            const isTransfer = t.type === "transfer";
            const Icon = isTransfer ? ArrowLeftRight : cat.icon;
            const color = isTransfer
              ? "text-muted-foreground"
              : t.type === "income"
                ? "text-primary"
                : "text-destructive";
            const sign = isTransfer ? "" : t.type === "income" ? "+" : "−";
            return (
              <GlassCard key={t.id} className="flex items-center gap-3 p-3">
                <div
                  className="size-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}
                >
                  <Icon className="size-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.note || t.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category} ·{" "}
                    {new Date(t.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 font-display text-sm min-[380px]:text-base font-semibold tabular",
                    color,
                  )}
                >
                  {sign}
                  {formatMoney(t.amount, currency, true).replace("-", "")}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
