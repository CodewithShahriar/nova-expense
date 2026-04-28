import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "All" && t.category !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!t.note?.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
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

  const filterOptions = ["All", ...Array.from(new Set(allCategories(custom).map((c) => c.name)))];

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name || "";

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
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

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mt-4">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-4 h-9 text-xs font-medium transition",
              filter === f ? "gradient-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground"
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
          // day total = expenses only (as label says "total expense for that date")
          const dayExpense = items.filter((i) => i.type === "expense").reduce((a, b) => a + b.amount, 0);
          return (
            <div key={date}>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {formatDayLabel(date)}
                </p>
                <p className="text-[11px] font-semibold tabular text-destructive">
                  −{formatMoney(dayExpense, currency, true)}
                </p>
              </div>
              <div className="space-y-2">
                {items.map((t) => {
                  const isTransfer = t.type === "transfer";
                  const cat = getCategory(t.category, custom);
                  const Icon = isTransfer ? ArrowLeftRight : cat.icon;

                  const amountColor =
                    t.type === "expense" ? "text-destructive"
                    : t.type === "income" ? "text-primary"
                    : "text-muted-foreground";
                  const sign = t.type === "expense" ? "−" : t.type === "income" ? "+" : "";

                  const subtitle = isTransfer
                    ? `${accountName(t.fromAccountId)} → ${accountName(t.toAccountId)}`
                    : `${t.category} · ${accountName(t.accountId)}`;

                  return (
                    <div key={t.id} className="group relative">
                      <GlassCard className="flex items-center gap-3 p-3">
                        <div className="size-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}>
                          <Icon className="size-5" style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.note || (isTransfer ? "Transfer" : t.category)}</p>
                          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-display font-semibold tabular", amountColor)}>
                            {sign}{formatMoney(t.amount, currency, true).replace("-", "")}
                          </p>
                        </div>
                        <button
                          onClick={() => { if (confirm("Delete this transaction?")) store.deleteTransaction(t.id); }}
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

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
