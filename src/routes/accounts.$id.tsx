import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowLeftRight, Trash2 } from "lucide-react";
import { store, useStore, formatMoney } from "@/lib/storage";
import { AccountCard } from "@/components/AccountCard";
import { GlassCard } from "@/components/GlassCard";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounts/$id")({
  component: AccountDetail,
});

function AccountDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const account = useStore((s) => s.accounts.find((a) => a.id === id));
  const currency = useStore((s) => s.settings.currency);
  const transactions = useStore((s) => s.transactions);
  const custom = useStore((s) => s.customCategories);

  if (!account) {
    return (
      <div className="px-4 min-[380px]:px-5 pt-12 text-center">
        <p className="text-muted-foreground">Account not found.</p>
        <Link to="/accounts" className="text-primary mt-3 inline-block">Back to accounts</Link>
      </div>
    );
  }

  const related = transactions.filter((t) =>
    t.accountId === id || t.fromAccountId === id || t.toAccountId === id
  );

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/accounts" aria-label="Back" className="size-10 rounded-full glass flex items-center justify-center active:scale-95">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold flex-1 truncate">{account.name}</h1>
      </div>

      <AccountCard account={account} currency={currency} />

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 mt-4">
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Type</p>
          <p className="mt-1 font-semibold capitalize">{account.type}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Transactions</p>
          <p className="mt-1 font-semibold">{related.length}</p>
        </GlassCard>
      </div>

      <h2 className="mt-6 mb-3 text-sm font-semibold">Transaction history</h2>

      {related.length === 0 && (
        <GlassCard className="text-center py-8">
          <p className="text-sm text-muted-foreground">No transactions for this account yet.</p>
        </GlassCard>
      )}

      <div className="space-y-2">
        {related.map((t) => {
          const isTransfer = t.type === "transfer";
          const isOutgoing = t.type === "expense" || (isTransfer && t.fromAccountId === id);
          const cat = getCategory(t.category, custom);
          const Icon = isTransfer ? ArrowLeftRight : cat.icon;
          const color = isTransfer ? "text-muted-foreground" : isOutgoing ? "text-destructive" : "text-primary";
          const sign = isOutgoing ? "−" : "+";
          return (
            <GlassCard key={t.id} className="flex items-center gap-3 p-3">
              <div className="size-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}>
                <Icon className="size-5" style={{ color: cat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.note || t.category}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </p>
              </div>
              <p className={cn("shrink-0 font-display text-sm min-[380px]:text-base font-semibold tabular", color)}>
                {sign}{formatMoney(t.amount, currency, true).replace("-", "")}
              </p>
            </GlassCard>
          );
        })}
      </div>

      <button
        onClick={() => {
          if (confirm(`Delete ${account.name}? Transactions tied to this account will be removed.`)) {
            store.deleteAccount(id);
            navigate({ to: "/accounts" });
          }
        }}
        className="mt-6 w-full h-12 rounded-2xl glass flex items-center justify-center gap-2 text-sm font-semibold text-destructive"
      >
        <Trash2 className="size-4" /> Delete account
      </button>
    </div>
  );
}
