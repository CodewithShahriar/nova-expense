import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import {
  ArrowLeftRight,
  AlertTriangle,
  Bell,
  Brain,
  CalendarDays,
  CreditCard,
  Gauge,
  LineChart,
  PiggyBank,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  useStore,
  store,
  formatMoney,
  type Account,
  type Budget,
  type Goal,
  type Transaction,
} from "@/lib/storage";
import { GlassCard } from "@/components/GlassCard";
import { AccountCard } from "@/components/AccountCard";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { billRuntimeStatus, billTimingLabel, daysUntil, formatDueDate } from "@/lib/bills";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const budgets = useStore((s) => s.budgets);
  const bills = useStore((s) => s.bills);
  const goals = useStore((s) => s.goals);
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

  const intelligence = useMemo(
    () => buildFinancialIntelligence(transactions, accounts, budgets, goals),
    [transactions, accounts, budgets, goals],
  );

  const recent = transactions.slice(0, 5);
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
        {transactions.length < 0 && (
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
        )}

        <section className="mt-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15">
                <Brain className="size-4 text-primary" />
              </div>
              <p className="text-sm font-semibold">Smart insights</p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
                intelligence.risk === "high"
                  ? "bg-destructive/15 text-destructive"
                  : intelligence.risk === "medium"
                    ? "bg-warning/15 text-warning"
                    : "bg-primary/15 text-primary",
              )}
            >
              {intelligence.risk} risk
            </span>
          </div>

          {transactions.length === 0 ? (
            <GlassCard className="p-4 flex gap-3 items-start">
              <div className="size-9 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Your assistant is ready</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add your first transaction to unlock pattern-based insights.
                </p>
                <button
                  onClick={() => store.seedDemo()}
                  className="mt-3 text-xs font-semibold text-primary hover:underline"
                >
                  Load sample data -&gt;
                </button>
              </div>
            </GlassCard>
          ) : (
            <div className="grid gap-2">
              {intelligence.cards.map((card, index) => (
                <InsightCard key={`${card.title}-${index}`} insight={card} />
              ))}
            </div>
          )}
        </section>

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
                search={{ type: undefined, scan: undefined }}
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

type RiskLevel = "low" | "medium" | "high";
type InsightTone = "good" | "warn" | "danger" | "neutral";

interface SmartInsight {
  title: string;
  body: string;
  metric: string;
  tone: InsightTone;
  icon: LucideIcon;
}

function InsightCard({ insight }: { insight: SmartInsight }) {
  const Icon = insight.icon;
  return (
    <GlassCard
      className={cn(
        "group p-3.5 transition duration-300 animate-slide-up",
        insight.tone === "danger" && "border-destructive/25 bg-destructive/10",
        insight.tone === "warn" && "border-warning/25 bg-warning/10",
        insight.tone === "good" && "border-primary/25 bg-primary/10",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105",
            insight.tone === "danger" && "bg-destructive/15 text-destructive",
            insight.tone === "warn" && "bg-warning/15 text-warning",
            insight.tone === "good" && "bg-primary/15 text-primary",
            insight.tone === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{insight.title}</p>
            <p
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                insight.tone === "danger" && "bg-destructive/15 text-destructive",
                insight.tone === "warn" && "bg-warning/15 text-warning",
                insight.tone === "good" && "bg-primary/15 text-primary",
                insight.tone === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {insight.metric}
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.body}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function buildFinancialIntelligence(
  transactions: Transaction[],
  accounts: Account[],
  budgets: Budget[],
  goals: Goal[],
): { risk: RiskLevel; cards: SmartInsight[] } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const currentWeekStart = addDays(todayStart, -6);
  const previousWeekStart = addDays(todayStart, -13);
  const previousWeekEnd = addDays(currentWeekStart, -1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = Math.max(1, now.getDate());

  const expenses = transactions.filter((tx) => tx.type === "expense");
  const incomes = transactions.filter((tx) => tx.type === "income");
  const currentWeekExpenses = expenses.filter((tx) => inRange(tx, currentWeekStart, now));
  const previousWeekExpenses = expenses.filter((tx) =>
    inRange(tx, previousWeekStart, previousWeekEnd),
  );
  const currentMonthExpenses = expenses.filter((tx) => inRange(tx, monthStart, now));
  const previousMonthExpenses = expenses.filter((tx) =>
    inRange(tx, previousMonthStart, previousMonthEnd),
  );
  const currentMonthIncome = sum(
    incomes.filter((tx) => inRange(tx, monthStart, now)).map((tx) => tx.amount),
  );
  const previousMonthIncome = sum(
    incomes
      .filter((tx) => inRange(tx, previousMonthStart, previousMonthEnd))
      .map((tx) => tx.amount),
  );

  const weekSpent = sum(currentWeekExpenses.map((tx) => tx.amount));
  const previousWeekSpent = sum(previousWeekExpenses.map((tx) => tx.amount));
  const weekChange = percentChange(weekSpent, previousWeekSpent);
  const monthSpent = sum(currentMonthExpenses.map((tx) => tx.amount));
  const previousMonthSpent = sum(previousMonthExpenses.map((tx) => tx.amount));
  const projectedMonthSpend = (monthSpent / dayOfMonth) * daysInMonth;
  const previousMonthDaily = previousMonthSpent / Math.max(1, previousMonthEnd.getDate());
  const currentMonthDaily = monthSpent / dayOfMonth;
  const monthlyTrend = percentChange(currentMonthDaily, previousMonthDaily);
  const totalBudget = sum(budgets.map((budget) => budget.limit));
  const totalBalance = sum(accounts.map((account) => account.balance));
  const dailyAverage = weekSpent / 7;
  const currentSavingsRate =
    currentMonthIncome > 0 ? (currentMonthIncome - monthSpent) / currentMonthIncome : 0;
  const previousSavingsRate =
    previousMonthIncome > 0 ? (previousMonthIncome - previousMonthSpent) / previousMonthIncome : 0;
  const savingsRateDrop = previousMonthIncome > 0 ? previousSavingsRate - currentSavingsRate : 0;
  const topCategory = topByAmount(currentMonthExpenses, (tx) => tx.category);
  const foodCurrent = sum(
    currentWeekExpenses.filter((tx) => tx.category === "Food").map((tx) => tx.amount),
  );
  const foodPrevious = sum(
    previousWeekExpenses.filter((tx) => tx.category === "Food").map((tx) => tx.amount),
  );
  const foodChange = percentChange(foodCurrent, foodPrevious);
  const mostUsedAccount = topByCount(
    transactions.filter((tx) => tx.type !== "transfer" && tx.accountId),
    (tx) => tx.accountId || "",
  );
  const mostUsedAccountName =
    accounts.find((account) => account.id === mostUsedAccount.key)?.name || "No account yet";
  const unusual = detectAnomaly(expenses);
  const overBudgetCategory = projectedCategoryOverage(
    currentMonthExpenses,
    budgets,
    dayOfMonth,
    daysInMonth,
  );
  const daysOfBalance = dailyAverage > 0 ? totalBalance / dailyAverage : Number.POSITIVE_INFINITY;

  let risk: RiskLevel = "low";
  if (
    (totalBudget > 0 && projectedMonthSpend > totalBudget * 1.15) ||
    daysOfBalance < 10 ||
    savingsRateDrop > 0.12
  ) {
    risk = "high";
  } else if (
    (totalBudget > 0 && projectedMonthSpend > totalBudget * 0.9) ||
    daysOfBalance < 21 ||
    savingsRateDrop > 0.05
  ) {
    risk = "medium";
  }

  const cards: SmartInsight[] = [];

  if (foodChange !== null && foodChange >= 30) {
    cards.push({
      title: "Food spending jumped",
      body: `You spent ${Math.round(foodChange)}% more on Food than last week.`,
      metric: "alert",
      tone: "danger",
      icon: AlertTriangle,
    });
  }

  if (totalBudget > 0 && projectedMonthSpend > totalBudget) {
    cards.push({
      title: "You are overspending this month",
      body: `At this pace, month-end spending may reach ${formatMoney(projectedMonthSpend, "BDT", true)}, above your ${formatMoney(totalBudget, "BDT", true)} budget.`,
      metric: risk,
      tone: risk === "high" ? "danger" : "warn",
      icon: Gauge,
    });
  }

  if (savingsRateDrop > 0.05) {
    cards.push({
      title: "Savings rate is decreasing",
      body: `Savings are down ${Math.round(savingsRateDrop * 100)} points versus last month.`,
      metric: "watch",
      tone: savingsRateDrop > 0.12 ? "danger" : "warn",
      icon: TrendingDown,
    });
  }

  if (daysOfBalance < 21) {
    cards.push({
      title: "You may run out of balance soon",
      body: `Your current balance covers about ${Math.max(1, Math.floor(daysOfBalance))} days at the last-7-day pace.`,
      metric: "cash",
      tone: daysOfBalance < 10 ? "danger" : "warn",
      icon: Wallet,
    });
  }

  if (unusual) {
    cards.push({
      title: "Unusual expense detected",
      body: `${unusual.category} at ${formatMoney(unusual.amount, "BDT", true)} is far above your usual transaction size.`,
      metric: "anomaly",
      tone: "danger",
      icon: AlertTriangle,
    });
  }

  if (overBudgetCategory) {
    cards.push({
      title: "Budget suggestion",
      body: `Reduce ${overBudgetCategory.category} spending by ${formatMoney(overBudgetCategory.overage, "BDT", true)} to stay on budget.`,
      metric: "action",
      tone: "warn",
      icon: Target,
    });
  }

  const goal = goals.find((item) => item.target > item.saved);
  if (goal) {
    const weeklyNeed = weeklyGoalNeed(goal);
    cards.push({
      title: "Goal suggestion",
      body: `Try saving ${formatMoney(weeklyNeed, "BDT", true)} this week to reach ${goal.name}.`,
      metric: "save",
      tone: "good",
      icon: PiggyBank,
    });
  }

  cards.push(
    {
      title: weekChange === null ? "Weekly spending baseline" : "Weekly comparison",
      body:
        weekChange === null
          ? `You spent ${formatMoney(weekSpent, "BDT", true)} in the last 7 days. More history will sharpen comparisons.`
          : `Spending is ${Math.abs(Math.round(weekChange))}% ${weekChange >= 0 ? "higher" : "lower"} than the previous week.`,
      metric:
        weekChange === null ? "new" : `${weekChange >= 0 ? "+" : ""}${Math.round(weekChange)}%`,
      tone: weekChange !== null && weekChange > 20 ? "warn" : "good",
      icon: weekChange !== null && weekChange >= 0 ? TrendingUp : TrendingDown,
    },
    {
      title: "Month-end prediction",
      body: `Estimated end-of-month spending is ${formatMoney(projectedMonthSpend, "BDT", true)} based on your current daily pace.`,
      metric: risk,
      tone: risk === "high" ? "danger" : risk === "medium" ? "warn" : "good",
      icon: LineChart,
    },
    {
      title: "Monthly spending trend",
      body:
        monthlyTrend === null
          ? "This month is building its first reliable trend."
          : `Daily spending is ${Math.abs(Math.round(monthlyTrend))}% ${monthlyTrend >= 0 ? "above" : "below"} last month's pace.`,
      metric:
        monthlyTrend === null
          ? "trend"
          : `${monthlyTrend >= 0 ? "+" : ""}${Math.round(monthlyTrend)}%`,
      tone: monthlyTrend !== null && monthlyTrend > 15 ? "warn" : "good",
      icon: CalendarDays,
    },
    {
      title: "Top category this month",
      body: `${topCategory.key || "No category"} leads monthly spending at ${formatMoney(topCategory.amount, "BDT", true)}.`,
      metric: topCategory.key || "none",
      tone: topCategory.amount > 0 ? "neutral" : "good",
      icon: Sparkles,
    },
    {
      title: "Most used account",
      body: `${mostUsedAccountName} appears in ${mostUsedAccount.count} transaction${mostUsedAccount.count === 1 ? "" : "s"}.`,
      metric: "account",
      tone: "neutral",
      icon: CreditCard,
    },
    {
      title: "Daily average",
      body: `You average ${formatMoney(dailyAverage, "BDT", true)} per day over the last 7 days.`,
      metric: "7 days",
      tone: dailyAverage > 0 ? "neutral" : "good",
      icon: ShieldCheck,
    },
  );

  return { risk, cards: cards.slice(0, 9) };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inRange(tx: Transaction, start: Date, end: Date) {
  const date = new Date(tx.date);
  return date >= start && date <= end;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function topByAmount(transactions: Transaction[], keyOf: (tx: Transaction) => string) {
  const totals = new Map<string, number>();
  for (const tx of transactions) totals.set(keyOf(tx), (totals.get(keyOf(tx)) || 0) + tx.amount);
  let top = { key: "", amount: 0 };
  totals.forEach((amount, key) => {
    if (amount > top.amount) top = { key, amount };
  });
  return top;
}

function topByCount(transactions: Transaction[], keyOf: (tx: Transaction) => string) {
  const totals = new Map<string, number>();
  for (const tx of transactions) totals.set(keyOf(tx), (totals.get(keyOf(tx)) || 0) + 1);
  let top = { key: "", count: 0 };
  totals.forEach((count, key) => {
    if (count > top.count) top = { key, count };
  });
  return top;
}

function detectAnomaly(expenses: Transaction[]) {
  if (expenses.length < 4) return expenses.find((tx) => tx.amount >= 10000) || null;
  const amounts = expenses.map((tx) => tx.amount);
  const average = sum(amounts) / amounts.length;
  const variance = sum(amounts.map((amount) => (amount - average) ** 2)) / amounts.length;
  const deviation = Math.sqrt(variance);
  const threshold = Math.max(average + deviation * 2, average * 2.5, 1000);
  return (
    expenses
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .find((tx) => tx.amount >= threshold) || null
  );
}

function projectedCategoryOverage(
  expenses: Transaction[],
  budgets: Budget[],
  dayOfMonth: number,
  daysInMonth: number,
) {
  const byCategory = new Map<string, number>();
  for (const tx of expenses)
    byCategory.set(tx.category, (byCategory.get(tx.category) || 0) + tx.amount);

  let top: { category: string; overage: number } | null = null;
  for (const budget of budgets) {
    const spent = byCategory.get(budget.category) || 0;
    const projected = (spent / dayOfMonth) * daysInMonth;
    const overage = projected - budget.limit;
    if (overage > 0 && (!top || overage > top.overage)) {
      top = { category: budget.category, overage };
    }
  }
  return top;
}

function weeklyGoalNeed(goal: Goal) {
  const remaining = Math.max(0, goal.target - goal.saved);
  if (!goal.deadline) return Math.ceil(remaining / 4);
  const days = Math.max(7, Math.ceil((+new Date(goal.deadline) - Date.now()) / 86400000));
  return Math.ceil(remaining / Math.max(1, Math.ceil(days / 7)));
}
