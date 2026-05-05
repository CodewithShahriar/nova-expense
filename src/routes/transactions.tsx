import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, ArrowLeftRight } from "lucide-react";
import { store, useStore, formatMoney } from "@/lib/storage";
import { getCategory, allCategories } from "@/lib/categories";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const currency = useStore((s) => s.settings.currency);
  const custom = useStore((s) => s.customCategories);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [balanceTick, setBalanceTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBalanceTick((tick) => tick + 1);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "All" && t.category !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!t.note?.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [transactions, query, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const t of filtered) {
      const d = new Date(t.date);
      const key = d.toDateString();
      (groups[key] ||= []).push(t);
    }
    return Object.entries(groups).sort((a, b) => +new Date(b[0]) - +new Date(a[0]));
  }, [filtered]);

  const dailySummaries = useMemo(() => {
    const summaries = new Map<
      string,
      {
        income: number;
        expense: number;
        accountBalances: Array<{ id: string; name: string; balance: number }>;
      }
    >();
    const effectsByAccount = new Map(accounts.map((account) => [account.id, 0]));
    const transactionsByDate = new Map<string, typeof transactions>();

    for (const t of transactions) {
      const key = new Date(t.date).toDateString();
      const dayTransactions = transactionsByDate.get(key) || [];
      dayTransactions.push(t);
      transactionsByDate.set(key, dayTransactions);

      const current = summaries.get(key) || {
        income: 0,
        expense: 0,
        accountBalances: [],
      };

      if (t.type === "income") {
        current.income += t.amount;
        addAccountEffect(effectsByAccount, t.accountId, t.amount);
      } else if (t.type === "expense") {
        current.expense += t.amount;
        addAccountEffect(effectsByAccount, t.accountId, -t.amount);
      } else if (t.type === "transfer") {
        addAccountEffect(effectsByAccount, t.fromAccountId, -t.amount);
        addAccountEffect(effectsByAccount, t.toAccountId, t.amount);
      }

      summaries.set(key, current);
    }

    const runningBalances = new Map(
      accounts.map((account) => [
        account.id,
        account.balance - (effectsByAccount.get(account.id) || 0),
      ]),
    );

    for (const [date, summary] of Array.from(summaries.entries()).sort(
      (a, b) => +new Date(a[0]) - +new Date(b[0]),
    )) {
      const dayTransactions = transactionsByDate.get(date) || [];

      for (const t of dayTransactions) {
        if (t.type === "income") {
          addAccountEffect(runningBalances, t.accountId, t.amount);
        } else if (t.type === "expense") {
          addAccountEffect(runningBalances, t.accountId, -t.amount);
        } else if (t.type === "transfer") {
          addAccountEffect(runningBalances, t.fromAccountId, -t.amount);
          addAccountEffect(runningBalances, t.toAccountId, t.amount);
        }
      }

      summaries.set(date, {
        ...summary,
        accountBalances: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          balance: runningBalances.get(account.id) || 0,
        })),
      });
    }

    return summaries;
  }, [transactions, accounts]);

  const filterOptions = ["All", ...Array.from(new Set(allCategories(custom).map((c) => c.name)))];

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name || "";

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <h1 className="font-display text-3xl font-bold">Activity</h1>
      <p className="text-sm text-muted-foreground mt-1">{transactions.length} transactions</p>

      <div className="glass mt-5 rounded-2xl h-12 px-4 flex items-center gap-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, categories…"
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 min-[380px]:-mx-5 min-[380px]:px-5 mt-4">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-4 h-9 text-xs font-medium transition",
              filter === f
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "glass text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-6">
        {grouped.length === 0 && (
          <GlassCard className="text-center py-10">
            <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
          </GlassCard>
        )}
        {grouped.map(([date, items]) => {
          const summary = dailySummaries.get(date) || {
            income: 0,
            expense: 0,
            accountBalances: accounts.map((account) => ({
              id: account.id,
              name: account.name,
              balance: account.balance,
            })),
          };
          return (
            <div key={date}>
              <div className="flex items-center justify-between gap-3 px-1 mb-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {formatDayLabel(date)}
                </p>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-[11px] font-semibold tabular">
                    {summary.income > 0 && (
                      <span className="text-primary">
                        +{formatMoney(summary.income, currency, true)}
                      </span>
                    )}
                    {summary.expense > 0 && (
                      <span className="text-destructive">
                        -{formatMoney(summary.expense, currency, true)}
                      </span>
                    )}
                  </div>
                  <AccountBalanceTicker
                    balances={summary.accountBalances}
                    currency={currency}
                    tick={balanceTick}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {items.map((t) => {
                  const isTransfer = t.type === "transfer";
                  const cat = getCategory(t.category, custom);
                  const Icon = isTransfer ? ArrowLeftRight : cat.icon;

                  const amountColor =
                    t.type === "expense"
                      ? "text-destructive"
                      : t.type === "income"
                        ? "text-primary"
                        : "text-muted-foreground";
                  const sign = t.type === "expense" ? "−" : t.type === "income" ? "+" : "";

                  const subtitle = isTransfer
                    ? `${accountName(t.fromAccountId)} → ${accountName(t.toAccountId)}`
                    : `${t.category} · ${accountName(t.accountId)}`;

                  return (
                    <div key={t.id} className="group relative">
                      <GlassCard className="flex items-center gap-3 p-3">
                        <div
                          className="size-11 rounded-2xl flex items-center justify-center shrink-0"
                          style={{
                            background: `color-mix(in oklch, ${cat.color} 18%, transparent)`,
                          }}
                        >
                          <Icon className="size-5" style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.note || (isTransfer ? "Transfer" : t.category)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "font-display text-sm min-[380px]:text-base font-semibold tabular",
                              amountColor,
                            )}
                          >
                            {sign}
                            {formatMoney(t.amount, currency, true).replace("-", "")}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Delete this transaction?")) store.deleteTransaction(t.id);
                          }}
                          className="ml-1 size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </GlassCard>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountBalanceTicker({
  balances,
  currency,
  tick,
}: {
  balances: Array<{ id: string; name: string; balance: number }>;
  currency: string;
  tick: number;
}) {
  const visibleBalances = balances.length
    ? balances
    : [{ id: "empty", name: "Balance", balance: 0 }];
  const account = visibleBalances[tick % visibleBalances.length];

  return (
    <div className="mt-0.5 h-4 min-w-36 overflow-hidden text-right text-[11px] font-semibold tabular">
      <span
        key={`${account.id}-${tick}`}
        className={cn(
          "block truncate animate-fade-in",
          account.balance <= 0 ? "text-destructive" : "text-primary",
        )}
      >
        {account.name} {formatMoney(account.balance, currency, true)}
      </span>
    </div>
  );
}

function addAccountEffect(
  balances: Map<string, number>,
  accountId: string | undefined,
  amount: number,
) {
  if (!accountId || !balances.has(accountId)) return;
  balances.set(accountId, (balances.get(accountId) || 0) + amount);
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
