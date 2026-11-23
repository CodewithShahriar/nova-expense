import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Bell,
  Coins,
  Plus,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { useStore, store, formatMoney } from "@/lib/storage";
import { GlassCard } from "@/components/GlassCard";
import { AccountCard } from "@/components/AccountCard";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { billRuntimeStatus, billTimingLabel, daysUntil, formatDueDate } from "@/lib/bills";
import { toast } from "sonner";

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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

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
    return { weekSpent, monthIncome, monthExpense };
  }, [transactions]);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => {
          const dateDiff = +new Date(b.date) - +new Date(a.date);
          return dateDiff || +new Date(b.createdAt || b.date) - +new Date(a.createdAt || a.date);
        })
        .slice(0, 5),
    [transactions],
  );

  const reminderBills = useMemo(
    () =>
      bills
        .filter((bill) => {
          const status = billRuntimeStatus(bill);
          if (status === "paid") return false;
          return status === "overdue" || daysUntil(bill.nextDueDate || bill.dueDate) <= 3;
        })
        .sort(
          (a, b) => +new Date(a.nextDueDate || a.dueDate) - +new Date(b.nextDueDate || b.dueDate),
        )
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

  const initials = (settings.name || "Sajibur Rahman")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function loadSampleData() {
    const loaded = store.seedDemo();
    if (loaded) {
      toast.success("Sample data loaded", {
        description: "Demo accounts and transactions are ready.",
      });
      return;
    }

    toast.info("Sample data is already loaded");
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      {/* Top bar with avatar & notification bell */}
      <div className="flex items-center justify-between mb-5 px-4 min-[380px]:px-5">
        <Link to="/settings" className="flex items-center gap-3 active:scale-[0.98] transition">
          {settings.avatar ? (
            <img
              src={settings.avatar}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-primary/40 shadow-glow"
            />
          ) : (
            <div className="size-11 rounded-full glass border border-white/15 flex items-center justify-center ring-2 ring-primary/30">
              <span className="text-primary font-display text-sm font-bold">
                {initials || <User className="size-5" />}
              </span>
            </div>
          )}
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {greeting}
            </p>
            <p className="font-display text-base font-bold text-foreground mt-0.5 truncate max-w-[190px]">
              {settings.name || "Sajibur Rahman"}
            </p>
          </div>
        </Link>

        <Link
          to="/settings"
          aria-label="Notifications & Settings"
          className="size-11 rounded-full glass flex items-center justify-center text-foreground hover:text-primary active:scale-95 transition relative shadow-card"
        >
          <Bell className="size-5" />
          <span className="size-2 rounded-full bg-primary absolute top-2.5 right-2.5 shadow-glow" />
        </Link>
      </div>

      {/* "My Cards" Header */}
      <div className="flex items-center justify-between mb-3 px-4 min-[380px]:px-5">
        <h2 className="font-display text-base min-[380px]:text-lg font-bold text-foreground">
          My Cards
        </h2>
        <Link
          to="/accounts"
          className="glass rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 active:scale-95 transition"
        >
          <span>Add Card</span>
          <Plus className="size-3.5" />
        </Link>
      </div>

      {/* Account carousel */}
      <div className="relative">
        <div
          ref={scroller}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 min-[380px]:px-5 pb-1"
        >
          {accounts.map((a) => (
            <div
              key={a.id}
              className="snap-center shrink-0 w-[92%] min-[380px]:w-[88%] md:w-[23rem]"
            >
              <Link to="/accounts/$id" params={{ id: a.id }}>
                <AccountCard account={a} currency={currency} />
              </Link>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="w-full">
              <div className="snap-center shrink-0 w-full md:w-[23rem] mb-3">
                <AccountCard
                  account={{
                    id: "preview-card",
                    name: "Sajibur's Visa",
                    type: "card",
                    brand: "VISA",
                    number: "•••• •••• 5466",
                    balance: 786898.67,
                    gradient: "linear-gradient(135deg, #D6F92B 0%, #C4F32A 60%, #A4E316 100%)",
                  }}
                  currency={currency}
                />
              </div>
              <GlassCard className="text-center py-6">
                <p className="text-sm text-muted-foreground">Custom accounts can be added</p>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="mt-3 inline-flex rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition"
                >
                  Load Sample Data
                </button>
              </GlassCard>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="grid grid-cols-4 gap-2.5 min-[380px]:gap-3 mt-4 px-4 min-[380px]:px-5">
        <Link
          to="/add"
          search={{ type: "income", scan: undefined, edit: undefined }}
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card group"
        >
          <div className="size-10 rounded-full glass flex items-center justify-center text-foreground group-hover:text-primary transition">
            <ArrowDownLeft className="size-4.5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Deposit
          </span>
        </Link>

        <Link
          to="/add"
          search={{ type: "expense", scan: undefined, edit: undefined }}
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card group"
        >
          <div className="size-10 rounded-full glass flex items-center justify-center text-foreground group-hover:text-primary transition">
            <ArrowUpRight className="size-4.5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Withdrawal
          </span>
        </Link>

        <Link
          to="/add"
          search={{ type: "transfer", scan: undefined, edit: undefined }}
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card group"
        >
          <div className="size-10 rounded-full glass flex items-center justify-center text-foreground group-hover:text-primary transition">
            <Coins className="size-4.5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Loan
          </span>
        </Link>

        <Link
          to="/bills"
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card group"
        >
          <div className="size-10 rounded-full glass flex items-center justify-center text-foreground group-hover:text-primary transition">
            <Receipt className="size-4.5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Remit
          </span>
        </Link>
      </div>

      <div className="px-4 min-[380px]:px-5">
        {/* Spending metrics cards */}
        <div className="grid grid-cols-2 gap-2.5 min-[380px]:gap-3 mt-4">
          <GlassCard className="p-4 min-[380px]:p-5 shadow-card border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full glass text-muted-foreground">
                <ArrowUpRight className="size-4" />
              </div>
              <span className="text-[10px] min-[380px]:text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Total Withdrawal
              </span>
            </div>
            <p className="mt-2.5 truncate font-display text-lg min-[380px]:text-xl font-bold tabular text-foreground">
              {formatMoney(stats.weekSpent, currency)}
            </p>
            <span className="text-[10px] text-muted-foreground">Past 7 days</span>
          </GlassCard>

          <GlassCard className="p-4 min-[380px]:p-5 shadow-card border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <ArrowDownLeft className="size-4" />
              </div>
              <span className="text-[10px] min-[380px]:text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Total Deposit
              </span>
            </div>
            <p className="mt-2.5 truncate font-display text-lg min-[380px]:text-xl font-bold tabular text-foreground">
              {formatMoney(stats.monthIncome || stats.monthExpense, currency)}
            </p>
            <span className="text-[10px] text-muted-foreground">This month</span>
          </GlassCard>
        </div>

        {/* Smart Insight */}
        <GlassCard className="mt-3.5 p-4 flex gap-3 items-start border-white/10">
          <div className="size-9 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 text-primary">
            <Sparkles className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Smart insight</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight}</p>
            {transactions.length === 0 && (
              <button
                type="button"
                onClick={loadSampleData}
                className="mt-2 text-xs font-semibold text-primary hover:underline block"
              >
                Load sample data →
              </button>
            )}
          </div>
        </GlassCard>

        {reminderBills.length > 0 && (
          <GlassCard className="mt-3.5 p-4 border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Bell className="size-4" />
                </div>
                <p className="text-sm font-semibold">Bill reminders</p>
              </div>
              <Link to="/bills" className="text-xs font-medium text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {reminderBills.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 rounded-2xl glass p-3 border-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{bill.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {billTimingLabel(bill)} · {formatDueDate(bill.nextDueDate || bill.dueDate)}
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

        {/* Transactions List */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="font-display text-base min-[380px]:text-lg font-bold text-foreground">
            Transactions
          </h2>
          <Link to="/transactions" className="text-xs text-muted-foreground hover:text-primary font-medium transition">
            View All
          </Link>
        </div>

        <div className="space-y-2.5">
          {recent.length === 0 && (
            <GlassCard className="text-center py-8">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <Link
                to="/add"
                search={{ type: undefined, scan: undefined, edit: undefined }}
                className="mt-3 inline-flex rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow"
              >
                Add transaction
              </Link>
            </GlassCard>
          )}

          {recent.map((t) => {
            const cat = getCategory(t.category, custom);
            const isTransfer = t.type === "transfer";
            const Icon = isTransfer ? ArrowLeftRight : cat.icon;
            const isIncome = t.type === "income";
            const account = accounts.find((a) => a.id === t.accountId);

            return (
              <div
                key={t.id}
                className="glass rounded-2xl p-3.5 flex items-center gap-3.5 border-white/8 transition hover:bg-white/[0.04]"
              >
                <div
                  className="size-11 rounded-full flex items-center justify-center shrink-0 border border-white/10"
                  style={{ background: `color-mix(in srgb, ${cat.color} 20%, rgba(22,26,34,0.85))` }}
                >
                  <Icon className="size-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {t.note || t.merchant || t.category}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(t.date).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {new Date(t.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {account?.name ? ` · ${account.name}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "font-display text-sm min-[380px]:text-base font-bold tabular",
                      isIncome ? "text-primary" : "text-foreground",
                    )}
                  >
                    {isIncome ? "+" : "−"}
                    {formatMoney(t.amount, currency).replace("-", "")}
                  </p>
                  <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-medium">
                    {isIncome ? "Deposit" : isTransfer ? "Transfer" : "Withdrawal"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
