import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  Check,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { store, useStore, formatMoney, type AccountType, type Transaction } from "@/lib/storage";
import { getCategory } from "@/lib/categories";
import { GlassCard } from "@/components/GlassCard";
import { AccountCard } from "@/components/AccountCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

const gradients = [
  "linear-gradient(135deg, oklch(0.42 0.15 25), oklch(0.28 0.12 15))",
  "linear-gradient(135deg, oklch(0.4 0.14 260), oklch(0.26 0.12 275))",
  "linear-gradient(135deg, oklch(0.38 0.12 160), oklch(0.24 0.1 170))",
  "linear-gradient(135deg, oklch(0.5 0.2 10), oklch(0.32 0.17 355))",
  "linear-gradient(135deg, oklch(0.4 0.14 80), oklch(0.26 0.12 60))",
  "linear-gradient(135deg, oklch(0.4 0.12 310), oklch(0.26 0.11 330))",
];

const types: { id: AccountType; label: string }[] = [
  { id: "bank", label: "Bank" },
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "wallet", label: "Mobile Wallet" },
];

function AccountsPage() {
  const navigate = useNavigate();
  const accounts = useStore((s) => s.accounts);
  const currency = useStore((s) => s.settings.currency);
  const custom = useStore((s) => s.customCategories);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [activeTab, setActiveTab] = useState<string | "all">("all");

  const total = accounts.reduce((a, b) => a + b.balance, 0);
  const transactions = useStore((s) => s.transactions);
  const visibleAccounts =
    activeTab === "all" ? accounts : accounts.filter((account) => account.id === activeTab);

  const recentTransactionsByAccount = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    const ordered = [...transactions].sort(
      (a, b) => +new Date(b.createdAt || b.date) - +new Date(a.createdAt || a.date),
    );
    for (const tx of ordered) {
      const ids = [tx.accountId, tx.fromAccountId, tx.toAccountId].filter(Boolean) as string[];
      for (const id of ids) {
        const list = grouped.get(id) || [];
        if (list.length < 3) grouped.set(id, [...list, tx]);
      }
    }
    return grouped;
  }, [transactions]);

  function moveAccount(id: string, direction: -1 | 1) {
    const index = accounts.findIndex((account) => account.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= accounts.length) return;

    const next = [...accounts];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    store.reorderAccounts(next.map((account) => account.id));
  }

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full glass active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length} accounts · Net worth
          </p>
        </div>
      </div>
      <p className="font-display text-3xl font-bold tabular">{formatMoney(total, currency)}</p>

      {accounts.length > 0 && (
        <AccountTabs
          accounts={accounts}
          activeId={activeTab}
          onSelect={(id) => {
            setActiveTab(id);
            setEditing(null);
          }}
        />
      )}

      {accounts.length > 1 && (
        <button
          onClick={() => {
            setEditing(null);
            setReordering((value) => !value);
          }}
          className={cn(
            "mt-5 h-10 rounded-xl px-4 inline-flex items-center gap-2 text-xs font-semibold transition",
            reordering ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground",
          )}
        >
          {reordering ? <Check className="size-3.5" /> : <GripVertical className="size-3.5" />}
          {reordering ? "Done reordering" : "Reorder cards"}
        </button>
      )}

      <div className="mt-6 space-y-4">
        {visibleAccounts.map((a) => {
          const index = accounts.findIndex((account) => account.id === a.id);
          const recentTxs = recentTransactionsByAccount.get(a.id) || [];
          return (
          <div key={a.id} className="space-y-2">
            {reordering ? (
              <AccountCard account={a} currency={currency} />
            ) : (
              <AccountCard
                account={a}
                currency={currency}
                onClick={() => navigate({ to: "/accounts/$id", params: { id: a.id } })}
              />
            )}
            {recentTxs.length > 0 ? (
              <div className="space-y-2 px-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Recent activity
                </p>
                {recentTxs.map((tx) => {
                  const isTransfer = tx.type === "transfer";
                  const isOutgoing = tx.type === "expense" || (isTransfer && tx.fromAccountId === a.id);
                  const cat = getCategory(tx.category, custom);
                  const Icon = isTransfer ? ArrowLeftRight : cat.icon;
                  const color = isTransfer
                    ? "text-muted-foreground"
                    : isOutgoing
                      ? "text-destructive"
                      : "text-primary";
                  const sign = isOutgoing ? "−" : "+";
                  const subtitle = isTransfer
                    ? `${accounts.find((account) => account.id === tx.fromAccountId)?.name || ""} → ${
                        accounts.find((account) => account.id === tx.toAccountId)?.name || ""
                      }`
                    : `${tx.category}`;
                  return (
                    <GlassCard key={tx.id} className="flex items-center gap-3 p-3">
                      <div
                        className="size-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}
                      >
                        <Icon className="size-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.note || (isTransfer ? "Transfer" : tx.category)}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
                      </div>
                      <p className={cn("font-display text-sm font-semibold tabular", color)}>
                        {sign}
                        {formatMoney(tx.amount, currency).replace("-", "")}
                      </p>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              <div className="px-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  No recent activity
                </p>
              </div>
            )}
            {!reordering && (
              <button
                onClick={() => navigate({ to: "/accounts/$id", params: { id: a.id } })}
                className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-white/10"
              >
                View all activity
              </button>
            )}
            <div className="flex gap-2">
              {reordering ? (
                <>
                  <button
                    onClick={() => moveAccount(a.id, -1)}
                    disabled={index === 0}
                    className="flex-1 h-10 rounded-xl glass flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground disabled:opacity-35"
                  >
                    <ArrowUp className="size-3.5" /> Up
                  </button>
                  <button
                    onClick={() => moveAccount(a.id, 1)}
                    disabled={index === accounts.length - 1}
                    className="flex-1 h-10 rounded-xl glass flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground disabled:opacity-35"
                  >
                    <ArrowDown className="size-3.5" /> Down
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(a.id)}
                    className="flex-1 h-10 rounded-xl glass flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete ${a.name}? Transactions tied to this account will also be removed.`,
                        )
                      )
                        store.deleteAccount(a.id);
                    }}
                    className="flex-1 h-10 rounded-xl glass flex items-center justify-center gap-2 text-xs font-medium text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </>
              )}
            </div>
            {!reordering && editing === a.id && (
              <EditAccountForm id={a.id} onClose={() => setEditing(null)} />
            )}
          </div>
        );
        })}
      </div>

      {adding ? (
        <AddAccountForm onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-5 w-full h-14 rounded-2xl glass flex items-center justify-center gap-2 text-sm font-semibold text-primary"
        >
          <Plus className="size-4" /> Add new account
        </button>
      )}
    </div>
  );
}

function AccountTabs({
  accounts,
  activeId,
  onSelect,
}: {
  accounts: { id: string; name: string; gradient: string }[];
  activeId: string | "all";
  onSelect: (id: string | "all") => void;
}) {
  return (
    <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar min-[380px]:-mx-5 min-[380px]:px-5">
      <button
        type="button"
        onClick={() => onSelect("all")}
        className={cn(
          "h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition",
          activeId === "all"
            ? "gradient-primary text-primary-foreground shadow-glow"
            : "glass text-muted-foreground",
        )}
      >
        All
      </button>
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          onClick={() => onSelect(account.id)}
          className={cn(
            "flex h-10 max-w-44 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold transition",
            activeId === account.id
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "glass text-muted-foreground",
          )}
        >
          <span
            className="size-5 shrink-0 rounded-full ring-1 ring-white/20"
            style={{ background: account.gradient }}
          />
          <span className="truncate">{account.name}</span>
        </button>
      ))}
    </div>
  );
}

function AddAccountForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [brand, setBrand] = useState("");
  const [number, setNumber] = useState("");
  const [balance, setBalance] = useState("");
  const [gradient, setGradient] = useState(gradients[0]);

  function save() {
    if (!name.trim()) return;
    store.addAccount({
      name: name.trim(),
      type,
      brand: brand.trim() || undefined,
      number: number.trim() || "- - -",
      balance: parseFloat(balance) || 0,
      gradient,
    });
    onClose();
  }

  return (
    <GlassCard className="mt-5 p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="font-semibold">New account</p>
        <button
          onClick={onClose}
          className="size-8 rounded-full glass flex items-center justify-center"
        >
          <X className="size-4" />
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name (e.g. BRAC Bank)"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
      />
      <div className="grid grid-cols-2 min-[380px]:grid-cols-4 gap-2">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={cn(
              "h-10 rounded-xl px-2 text-xs font-medium",
              type === t.id
                ? "gradient-primary text-primary-foreground"
                : "glass text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        placeholder="Brand / label (e.g. Visa, Mastercard, bKash)"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
      />
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Account number (demo)"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
      />
      <input
        value={balance}
        onChange={(e) => setBalance(e.target.value.replace(/[^0-9.]/g, ""))}
        inputMode="decimal"
        placeholder="Opening balance"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none tabular"
      />
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Card color</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {gradients.map((g) => (
            <button
              key={g}
              onClick={() => setGradient(g)}
              className={cn(
                "shrink-0 h-10 w-16 rounded-xl border-2",
                gradient === g ? "border-primary" : "border-transparent",
              )}
              style={{ background: g }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={save}
        className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Check className="size-4" /> Create account
      </button>
    </GlassCard>
  );
}

function EditAccountForm({ id, onClose }: { id: string; onClose: () => void }) {
  const account = useStore((s) => s.accounts.find((a) => a.id === id))!;
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [brand, setBrand] = useState(account.brand || "");
  const [number, setNumber] = useState(account.number || "");
  const [balance, setBalance] = useState(String(account.balance));
  const [gradient, setGradient] = useState(account.gradient);

  function save() {
    store.updateAccount(id, {
      name: name.trim(),
      type,
      brand: brand.trim() || undefined,
      number: number.trim() || "- - -",
      balance: parseFloat(balance) || 0,
      gradient,
    });
    onClose();
  }

  return (
    <GlassCard className="p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Edit account</p>
        <button
          onClick={onClose}
          className="size-8 rounded-full glass flex items-center justify-center"
        >
          <X className="size-4" />
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
      />
      <div className="grid grid-cols-2 min-[380px]:grid-cols-4 gap-2">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={cn(
              "h-10 rounded-xl px-2 text-xs font-medium",
              type === t.id
                ? "gradient-primary text-primary-foreground"
                : "glass text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        placeholder="Brand"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
      />
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Number"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
      />
      <input
        value={balance}
        onChange={(e) => setBalance(e.target.value.replace(/[^0-9.]/g, ""))}
        inputMode="decimal"
        placeholder="Current balance"
        className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none tabular"
      />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {gradients.map((g) => (
          <button
            key={g}
            onClick={() => setGradient(g)}
            className={cn(
              "shrink-0 h-10 w-16 rounded-xl border-2",
              gradient === g ? "border-primary" : "border-transparent",
            )}
            style={{ background: g }}
          />
        ))}
      </div>
      <button
        onClick={save}
        className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Check className="size-4" /> Save
      </button>
    </GlassCard>
  );
}
