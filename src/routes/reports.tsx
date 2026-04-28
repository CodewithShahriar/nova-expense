import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { useStore, formatMoney } from "@/lib/storage";
import { getCategory } from "@/lib/categories";
import { GlassCard } from "@/components/GlassCard";
import { TrendingUp, TrendingDown, Flame } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const custom = useStore((s) => s.customCategories);

  const { byCategory, byMonth, totalIncome, totalExpense, topCategory } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const catMap: Record<string, number> = {};
    let income = 0, expense = 0;

    for (const t of transactions) {
      if (new Date(t.date) < monthStart) continue;
      if (t.type === "expense") {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        expense += t.amount;
      } else {
        income += t.amount;
      }
    }

    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value, color: getCategory(name, custom).color }))
      .sort((a, b) => b.value - a.value);

    // Last 6 months bar
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      let mi = 0, me = 0;
      for (const t of transactions) {
        const td = new Date(t.date);
        if (td >= d && td < nd) {
          if (t.type === "income") mi += t.amount;
          else me += t.amount;
        }
      }
      months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), income: mi, expense: me });
    }

    return {
      byCategory, byMonth: months,
      totalIncome: income, totalExpense: expense,
      topCategory: byCategory[0]?.name,
    };
  }, [transactions]);

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <h1 className="font-display text-3xl font-bold">Reports</h1>
      <p className="text-sm text-muted-foreground mt-1">Your month at a glance</p>

      {/* Income vs Expense */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="size-4" />
            <span className="text-[11px] uppercase tracking-wider font-medium">Income</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular">{formatMoney(totalIncome, currency, true)}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <TrendingDown className="size-4" />
            <span className="text-[11px] uppercase tracking-wider font-medium">Expense</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular">{formatMoney(totalExpense, currency, true)}</p>
        </GlassCard>
      </div>

      {/* Top category */}
      {topCategory && (
        <GlassCard className="mt-3 p-4 flex items-center gap-3">
          <div className="size-10 rounded-2xl gradient-primary flex items-center justify-center">
            <Flame className="size-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Top spending category</p>
            <p className="font-semibold">{topCategory} · <span className="tabular">{formatMoney(byCategory[0].value, currency, true)}</span></p>
          </div>
        </GlassCard>
      )}

      {/* Pie */}
      <GlassCard className="mt-3 p-5">
        <p className="text-sm font-semibold">Spending by category</p>
        {byCategory.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground py-10">No expense data this month.</p>
        ) : (
          <>
            <div className="h-56 mt-2 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" innerRadius={60} outerRadius={88} paddingAngle={3} stroke="none">
                    {byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="font-display text-xl font-bold tabular">{formatMoney(totalExpense, currency, true)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {byCategory.slice(0, 6).map((c) => {
                const pct = totalExpense > 0 ? (c.value / totalExpense) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="text-sm flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground tabular">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-semibold tabular w-20 text-right">{formatMoney(c.value, currency, true)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </GlassCard>

      {/* Monthly bars */}
      <GlassCard className="mt-3 p-5">
        <p className="text-sm font-semibold">6-month trend</p>
        <div className="h-48 mt-3 -mx-2">
          <ResponsiveContainer>
            <BarChart data={byMonth} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatMoney(v, currency, true)}
              />
              <Bar dataKey="income" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-5 text-xs mt-2">
          <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: "var(--color-chart-1)" }} />Income</div>
          <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: "var(--color-chart-4)" }} />Expense</div>
        </div>
      </GlassCard>
    </div>
  );
}
