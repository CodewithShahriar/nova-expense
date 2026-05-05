import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, CalendarDays, Check, Clock3, Plus, Receipt, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { allCategories, getCategory } from "@/lib/categories";
import { billRuntimeStatus, billTimingLabel, formatDueDate } from "@/lib/bills";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  store,
  useStore,
  useSyncStatus,
  type Account,
  type Bill,
} from "@/lib/storage";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

const repeatOptions: Bill["repeat"][] = ["none", "weekly", "monthly", "yearly"];
const tabs: Array<{ id: Bill["status"]; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "paid", label: "Paid" },
];

function BillsPage() {
  const bills = useStore((s) => s.bills);
  const accounts = useStore((s) => s.accounts);
  const custom = useStore((s) => s.customCategories);
  const currency = useStore((s) => s.settings.currency);
  const syncMode = useSyncStatus((s) => s.mode);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<Bill["status"]>("upcoming");

  const grouped = useMemo(() => {
    const result: Record<Bill["status"], Bill[]> = {
      upcoming: [],
      overdue: [],
      paid: [],
    };

    bills.forEach((bill) => {
      result[billRuntimeStatus(bill)].push(bill);
    });

    result.upcoming.sort(
      (a, b) => +new Date(a.nextDueDate || a.dueDate) - +new Date(b.nextDueDate || b.dueDate),
    );
    result.overdue.sort(
      (a, b) => +new Date(a.nextDueDate || a.dueDate) - +new Date(b.nextDueDate || b.dueDate),
    );
    result.paid.sort((a, b) => +new Date(b.paidAt || b.dueDate) - +new Date(a.paidAt || a.dueDate));
    return result;
  }, [bills]);

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Bills</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reminders, due dates, and paid bills</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow active:scale-95"
          aria-label="Add bill"
        >
          {adding ? (
            <X className="size-5 text-primary-foreground" />
          ) : (
            <Plus className="size-5 text-primary-foreground" />
          )}
        </button>
      </div>

      <GlassCard className="mt-5 overflow-hidden p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15">
            <Bell className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Next payment</p>
            <p className="mt-1 truncate font-semibold">
              {grouped.overdue[0]?.name || grouped.upcoming[0]?.name || "No active bills"}
            </p>
          </div>
          <p className="font-display text-lg font-bold tabular">
            {formatMoney(
              grouped.overdue[0]?.amount || grouped.upcoming[0]?.amount || 0,
              currency,
              true,
            )}
          </p>
        </div>
      </GlassCard>

      {adding && (
        <AddBillForm
          accounts={accounts}
          categories={allCategories(custom)
            .filter((category) => category.type !== "income")
            .map((category) => category.name)}
          onClose={() => setAdding(false)}
        />
      )}

      {syncMode === "loading" && (
        <GlassCard className="mt-4 p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-2xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        </GlassCard>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-10 rounded-xl text-xs font-semibold transition",
              tab === item.id
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground",
            )}
          >
            {item.label} {grouped[item.id].length}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {grouped[tab].length === 0 ? (
          <EmptyBills tab={tab} />
        ) : (
          grouped[tab].map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              currency={currency}
              accountName={accountName(accounts, bill.accountId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AddBillForm({
  accounts,
  categories,
  onClose,
}: {
  accounts: Account[];
  categories: string[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [repeat, setRepeat] = useState<Bill["repeat"]>("monthly");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState(
    categories.includes("Bills") ? "Bills" : categories[0] || "Bills",
  );
  const [notes, setNotes] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);

    if (!name.trim()) {
      toast.error("Bill name required", {
        description: "Add a name like Electricity or Internet.",
      });
      return;
    }
    if (!value || value <= 0) {
      toast.error("Amount required", { description: "Enter the bill amount in BDT." });
      return;
    }
    if (!accountId) {
      toast.error("Select an account", { description: "Choose which account pays this bill." });
      return;
    }

    store.addBill({
      name: name.trim(),
      amount: value,
      dueDate: new Date(dueDate).toISOString(),
      nextDueDate: new Date(dueDate).toISOString(),
      repeat,
      accountId,
      category,
      notes: notes.trim() || undefined,
    });
    toast.success("Bill reminder created", {
      description: `${name.trim()} is now on your bill calendar.`,
    });
    onClose();
  }

  return (
    <GlassCard className="mt-4 p-4 animate-slide-up">
      <form onSubmit={save} className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">New bill reminder</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full glass"
          >
            <X className="size-4" />
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bill name"
          className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="Amount ৳"
            className="glass h-12 min-w-0 rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="glass h-12 min-w-0 rounded-2xl px-3 text-sm outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {repeatOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRepeat(item)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3 text-xs font-semibold capitalize",
                repeat === item
                  ? "gradient-primary text-primary-foreground"
                  : "glass text-muted-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.slice(0, 12).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3 text-xs font-semibold",
                category === item
                  ? "gradient-primary text-primary-foreground"
                  : "glass text-muted-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
        />

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="size-4" />
          Save reminder
        </button>
      </form>
    </GlassCard>
  );
}

function BillCard({
  bill,
  currency,
  accountName,
}: {
  bill: Bill;
  currency: string;
  accountName: string;
}) {
  const status = billRuntimeStatus(bill);
  const cat = getCategory(bill.category, []);
  const Icon = cat.icon;

  function markPaid() {
    store.markBillPaid(bill.id);
    toast.success("Bill paid", {
      description: `${bill.name} was added to transactions as an expense.`,
    });
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}
        >
          <Icon className="size-5" style={{ color: cat.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{bill.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {accountName} · {bill.category} · {bill.repeat}
              </p>
            </div>
            <p className="shrink-0 font-display text-base font-bold tabular">
              {formatMoney(bill.amount, currency, true)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BillBadge status={status} label={billTimingLabel(bill)} />
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              <CalendarDays className="size-3" />
              {status === "paid" && bill.paidAt
                ? `Paid ${formatDueDate(bill.paidAt)}`
                : formatDueDate(bill.nextDueDate || bill.dueDate)}
            </span>
          </div>

          {bill.notes && <p className="mt-2 text-xs text-muted-foreground">{bill.notes}</p>}

          <div className="mt-3 flex gap-2">
            {status !== "paid" && (
              <button
                type="button"
                onClick={markPaid}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl gradient-primary text-xs font-semibold text-primary-foreground"
              >
                <Check className="size-4" />
                Mark paid
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                store.deleteBill(bill.id);
                toast.success("Bill removed");
              }}
              className="flex h-10 w-12 items-center justify-center rounded-xl glass text-muted-foreground hover:text-destructive"
              aria-label="Delete bill"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function BillBadge({ status, label }: { status: Bill["status"]; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "paid"
          ? "bg-primary/15 text-primary"
          : status === "overdue"
            ? "bg-destructive/15 text-destructive"
            : "bg-warning/15 text-warning",
      )}
      style={status === "upcoming" ? { color: "var(--color-warning)" } : undefined}
    >
      {status === "paid" ? <Check className="size-3" /> : <Clock3 className="size-3" />}
      {label}
    </span>
  );
}

function EmptyBills({ tab }: { tab: Bill["status"] }) {
  return (
    <GlassCard className="py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Receipt className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-semibold">No {tab} bills</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Bill reminders you create will appear here.
      </p>
    </GlassCard>
  );
}

function accountName(accounts: Array<{ id: string; name: string }>, id?: string) {
  return accounts.find((account) => account.id === id)?.name || "No account";
}
