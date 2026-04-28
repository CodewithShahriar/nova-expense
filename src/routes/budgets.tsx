import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { store, useStore, formatMoney } from "@/lib/storage";
import { getCategory, allCategories } from "@/lib/categories";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/budgets")({
  component: BudgetsPage,
});

function BudgetsPage() {
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const custom = useStore((s) => s.customCategories);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState("Food");
  const [newLimit, setNewLimit] = useState("");

  const spendByCat = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      if (new Date(t.date) < monthStart) continue;
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
    return map;
  }, [transactions]);

  const totalLimit = budgets.reduce((a, b) => a + b.limit, 0);
  const totalSpent = budgets.reduce((a, b) => a + (spendByCat[b.category] || 0), 0);
  const totalPct = totalLimit > 0 ? Math.min(1, totalSpent / totalLimit) : 0;

  const available = allCategories(custom).filter((c) => c.type !== "income" && c.name !== "Transfer" && !budgets.find((b) => b.category === c.name));

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <h1 className="font-display text-3xl font-bold">Budgets</h1>
      <p className="text-sm text-muted-foreground mt-1">Keep each category in check</p>

      {/* Overall */}
      <GlassCard className="mt-5 p-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 size-40 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">This month</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold tabular">{formatMoney(totalSpent, currency, true)}</span>
          <span className="text-sm text-muted-foreground">of {formatMoney(totalLimit, currency, true)}</span>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${totalPct * 100}%`, background: totalPct >= 1 ? "var(--gradient-danger)" : "var(--gradient-primary)" }}
          />
        </div>
      </GlassCard>

      {/* Category budgets */}
      <div className="mt-6 space-y-3">
        {budgets.map((b) => {
          const spent = spendByCat[b.category] || 0;
          const pct = b.limit > 0 ? spent / b.limit : 0;
          const over = pct >= 1;
          const near = pct >= 0.8 && !over;
          const cat = getCategory(b.category, custom);
          const Icon = cat.icon;
          const isEditing = editing === b.category;
          return (
            <GlassCard key={b.category} className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}>
                  <Icon className="size-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{b.category}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    {formatMoney(spent, currency, true)} / {formatMoney(b.limit, currency, true)}
                  </p>
                </div>
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-20 h-9 rounded-xl bg-muted px-2 text-sm outline-none text-right tabular"
                      autoFocus
                    />
                    <button
                      onClick={() => { const v = parseFloat(value); if (v > 0) store.upsertBudget({ category: b.category, limit: v }); setEditing(null); }}
                      className="size-9 rounded-xl gradient-primary flex items-center justify-center"
                    >
                      <Check className="size-4 text-primary-foreground" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditing(b.category); setValue(String(b.limit)); }}
                    className="size-9 rounded-xl glass flex items-center justify-center text-muted-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700")}
                  style={{
                    width: `${Math.min(1, pct) * 100}%`,
                    background: over ? "var(--gradient-danger)" : "var(--gradient-primary)",
                  }}
                />
              </div>
              {over && <p className="mt-2 text-xs text-destructive font-medium">Exceeded by {formatMoney(spent - b.limit, currency)}</p>}
              {near && <p className="mt-2 text-xs text-warning font-medium" style={{ color: "var(--color-warning)" }}>Nearing limit — {Math.round(pct * 100)}% used</p>}
            </GlassCard>
          );
        })}
      </div>

      {/* Add */}
      {adding ? (
        <GlassCard className="mt-3 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold flex-1">New budget</p>
            <button onClick={() => setAdding(false)} className="size-8 rounded-full glass flex items-center justify-center"><X className="size-4" /></button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {available.map((c) => (
              <button
                key={c.name}
                onClick={() => setNewCat(c.name)}
                className={cn("shrink-0 rounded-full px-3 h-9 text-xs font-medium", newCat === c.name ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground")}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="Monthly limit"
              className="flex-1 h-11 rounded-xl bg-muted px-3 text-sm outline-none tabular"
            />
            <button
              onClick={() => { const v = parseFloat(newLimit); if (v > 0 && newCat) { store.upsertBudget({ category: newCat, limit: v }); setAdding(false); setNewLimit(""); } }}
              className="h-11 px-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm"
            >
              Add
            </button>
          </div>
        </GlassCard>
      ) : (
        available.length > 0 && (
          <button
            onClick={() => { setAdding(true); setNewCat(available[0].name); }}
            className="mt-3 w-full h-14 rounded-2xl glass flex items-center justify-center gap-2 text-sm font-semibold text-primary"
          >
            <Plus className="size-4" /> Add budget
          </button>
        )
      )}
    </div>
  );
}
