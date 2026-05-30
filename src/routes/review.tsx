import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { getCategory } from "@/lib/categories";
import { formatMoney, useStore, type Transaction } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  component: MonthlyReviewPage,
});

function MonthlyReviewPage() {
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const custom = useStore((s) => s.customCategories);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const review = useMemo(
    () => buildReview(transactions, month, custom),
    [transactions, month, custom],
  );
  const currentMonth = startOfMonth(new Date());
  const canGoNext = month.getTime() < currentMonth.getTime();

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+9.5rem)] animate-fade-in">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          to="/reports"
          aria-label="Back to reports"
          className="flex size-10 items-center justify-center rounded-full glass active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="font-display text-2xl font-bold">Monthly Review</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Your spending story</p>
        </div>
        <div className="size-10" />
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="gradient-primary p-5 text-primary-foreground">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              className="flex size-10 items-center justify-center rounded-2xl bg-white/15 active:scale-95"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest opacity-75">Review for</p>
              <p className="mt-1 font-display text-2xl font-bold">
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={!canGoNext}
              className="flex size-10 items-center justify-center rounded-2xl bg-white/15 active:scale-95 disabled:opacity-35"
              aria-label="Next month"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <p className="mt-5 text-center text-sm font-medium opacity-90">{review.story}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          <SummaryMetric label="Income" value={formatMoney(review.income, currency)} tone="income" />
          <SummaryMetric label="Expense" value={formatMoney(review.expense, currency)} tone="danger" />
          <SummaryMetric
            label="Savings"
            value={`${Math.round(review.savingsRate)}%`}
            tone={review.net >= 0 ? "income" : "danger"}
          />
        </div>
      </GlassCard>

      {review.monthTransactions.length === 0 ? (
        <GlassCard className="mt-4 py-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <CalendarDays className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-semibold">No transactions this month</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Add income or expenses to generate a monthly review.
          </p>
        </GlassCard>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <InsightCard
              icon={Flame}
              title="Top category"
              value={review.topCategory?.name || "None"}
              detail={
                review.topCategory
                  ? `${formatMoney(review.topCategory.value, currency)} of spending`
                  : "No expense category yet"
              }
            />
            <InsightCard
              icon={Receipt}
              title="Biggest spend"
              value={review.biggestExpense?.note || review.biggestExpense?.category || "None"}
              detail={
                review.biggestExpense
                  ? formatMoney(review.biggestExpense.amount, currency)
                  : "No expense this month"
              }
              tone="danger"
            />
          </div>

          <GlassCard className="mt-3 flex items-center gap-3 p-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
              <PiggyBank className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Saving opportunity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {review.savingOpportunity
                  ? `Cutting ${review.savingOpportunity.category} by 20% could save ${formatMoney(
                      review.savingOpportunity.amount,
                      currency,
                    )}.`
                  : "No clear saving opportunity yet. Keep tracking this month."}
              </p>
            </div>
          </GlassCard>

          <GlassCard className="mt-3 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-semibold">Category breakdown</p>
            </div>
            <div className="space-y-3">
              {review.byCategory.slice(0, 8).map((category) => {
                const pct = review.expense > 0 ? (category.value / review.expense) * 100 : 0;
                return (
                  <div key={category.name}>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: category.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {category.name}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular">
                        {formatMoney(category.value, currency)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, pct)}%`, background: category.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "income" | "danger";
}) {
  return (
    <div className="rounded-2xl bg-muted/45 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-display text-sm font-bold tabular min-[380px]:text-base",
          tone === "income" && "text-primary",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  value,
  detail,
  tone = "income",
}: {
  icon: typeof TrendingUp;
  title: string;
  value: string;
  detail: string;
  tone?: "income" | "danger";
}) {
  return (
    <GlassCard className="p-4">
      <div
        className={cn(
          "mb-3 flex size-10 items-center justify-center rounded-2xl",
          tone === "income" ? "bg-primary/15" : "bg-destructive/15",
        )}
      >
        <Icon className={cn("size-5", tone === "income" ? "text-primary" : "text-destructive")} />
      </div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </GlassCard>
  );
}

function buildReview(
  transactions: Transaction[],
  month: Date,
  custom: Parameters<typeof getCategory>[1],
) {
  const start = startOfMonth(month);
  const end = addMonths(start, 1);
  const monthTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date >= start && date < end;
  });

  let income = 0;
  let expense = 0;
  const categoryTotals = new Map<string, number>();
  let biggestExpense: Transaction | undefined;

  monthTransactions.forEach((transaction) => {
    if (transaction.type === "income") {
      income += transaction.amount;
      return;
    }
    if (transaction.type !== "expense") return;

    expense += transaction.amount;
    categoryTotals.set(
      transaction.category,
      (categoryTotals.get(transaction.category) || 0) + transaction.amount,
    );
    if (!biggestExpense || transaction.amount > biggestExpense.amount) {
      biggestExpense = transaction;
    }
  });

  const byCategory = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({ name, value, color: getCategory(name, custom).color }))
    .sort((a, b) => b.value - a.value);
  const topCategory = byCategory[0];
  const net = income - expense;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const savingOpportunity = topCategory
    ? { category: topCategory.name, amount: Math.round(topCategory.value * 0.2) }
    : null;

  return {
    monthTransactions,
    income,
    expense,
    net,
    savingsRate,
    byCategory,
    topCategory,
    biggestExpense,
    savingOpportunity,
    story: monthStory({ income, expense, savingsRate, topCategory }),
  };
}

function monthStory({
  income,
  expense,
  savingsRate,
  topCategory,
}: {
  income: number;
  expense: number;
  savingsRate: number;
  topCategory?: { name: string; value: number };
}) {
  if (!income && !expense) return "No activity yet for this month.";
  if (!expense) return "You recorded income this month without any spending yet.";
  if (!income) {
    return topCategory
      ? `${topCategory.name} is driving most of this month's spending.`
      : "This month has expenses but no recorded income yet.";
  }
  if (savingsRate >= 30) {
    return `Strong month. You saved about ${Math.round(savingsRate)}% of your income.`;
  }
  if (savingsRate >= 0) {
    return topCategory
      ? `${topCategory.name} is your biggest cost while you stay net positive.`
      : "You are staying net positive this month.";
  }
  return "Spending is ahead of income this month. Review the biggest categories first.";
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}
