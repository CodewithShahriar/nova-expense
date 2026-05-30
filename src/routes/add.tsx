import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ImagePlus, ScanLine, Trash2 } from "lucide-react";
import {
  formatMoney,
  store,
  useStore,
  type Bill,
  type Transaction,
  type TxType,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { CategoryPicker } from "@/components/CategoryPicker";
import { DatePicker } from "@/components/DatePicker";
import { AccountSelect } from "@/components/AccountSelect";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { resizeReceiptImage } from "@/lib/receiptOcr";
import { toast } from "sonner";

export const Route = createFileRoute("/add")({
  validateSearch: (search: Record<string, unknown>) => ({
    type:
      search.type === "income" || search.type === "expense" || search.type === "transfer"
        ? search.type
        : undefined,
    scan: search.scan === "receipt" ? "receipt" : undefined,
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  component: AddTransaction,
});

function AddTransaction() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const currency = useStore((s) => s.settings.currency);
  const accounts = useStore((s) => s.accounts);
  const custom = useStore((s) => s.customCategories);
  const transactions = useStore((s) => s.transactions);
  const bills = useStore((s) => s.bills);
  const editing = search.edit ? transactions.find((t) => t.id === search.edit) : undefined;

  const initialType = (editing?.type || search.type || "expense") as TxType;
  const initialCategory =
    editing?.type === "transfer"
      ? "Transfer"
      : editing?.category || (initialType === "income" ? "Salary" : "Food");
  const [type, setType] = useState<TxType>(initialType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState<string>(initialCategory);
  const [note, setNote] = useState(editing?.note || "");
  const [date, setDate] = useState(() => editing?.date || new Date().toISOString());
  const [accountId, setAccountId] = useState<string>(editing?.accountId || accounts[0]?.id || "");
  const [fromId, setFromId] = useState<string>(editing?.fromAccountId || accounts[0]?.id || "");
  const [toId, setToId] = useState<string>(
    editing?.toAccountId || accounts[1]?.id || accounts[0]?.id || "",
  );
  const [receiptImage, setReceiptImage] = useState<string | undefined>(editing?.receiptImage);
  const [catOpen, setCatOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteFocused, setNoteFocused] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);

  const cat = getCategory(category, custom);
  const CatIcon = cat.icon;
  const noteSuggestions = useMemo(
    () => suggestNotes(transactions, {
      category,
      type,
      query: note,
      editingId: editing?.id,
    }),
    [transactions, category, type, note, editing?.id],
  );
  const showNoteSuggestions = noteFocused && type !== "transfer" && noteSuggestions.length > 0;

  async function attachReceipt(file?: File) {
    if (!file) return;
    try {
      const resized = await resizeReceiptImage(file);
      setReceiptImage(resized);
      toast.success("Receipt attached");
    } catch {
      toast.error("Could not attach image", {
        description: "Try a smaller or clearer image file.",
      });
    }
  }

  function keepNoteVisible() {
    window.setTimeout(() => {
      noteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }

    if (type === "transfer") {
      if (!fromId || !toId) {
        setError("Select both accounts");
        return;
      }
      if (fromId === toId) {
        setError("Pick two different accounts");
        return;
      }
      const payload = {
        type,
        amount: value,
        category: "Transfer",
        note: note.trim() || undefined,
        date,
        fromAccountId: fromId,
        toAccountId: toId,
        receiptImage,
      };
      if (editing) store.updateTransaction(editing.id, payload);
      else store.addTransaction(payload);
    } else {
      if (!category) {
        setError("Pick a category");
        return;
      }
      if (!accountId) {
        setError("Select an account");
        return;
      }
      const payload = {
        type,
        amount: value,
        category: category,
        note: note.trim() || undefined,
        date,
        accountId,
        receiptImage,
      };
      if (editing) store.updateTransaction(editing.id, payload);
      else {
        store.addTransaction(payload);
        suggestRecurringBill({
          current: payload,
          transactions,
          bills,
        });
        alertUnusualTransaction({
          current: payload,
          transactions,
          currency,
        });
      }
    }
    navigate({ to: editing ? "/transactions" : "/" });
  }

  const typeColor =
    type === "expense"
      ? "text-destructive"
      : type === "income"
        ? "text-primary"
        : "text-foreground";

  return (
    <div className="flex h-[100dvh] min-h-[100svh] flex-col overflow-hidden animate-slide-up">
      <div className="shrink-0 flex items-center justify-between px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 min-[380px]:pb-4">
        <button
          onClick={() => navigate({ to: "/" })}
          aria-label="Back"
          className="size-10 rounded-full glass flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">{editing ? "Edit transaction" : "New transaction"}</h1>
        <div className="size-10" />
      </div>

      {/* 3-way toggle */}
      <div className="shrink-0 px-4 min-[380px]:px-5">
        <div className="glass rounded-full p-1 grid grid-cols-3 relative h-12">
          <div
            className={cn(
              "absolute top-1 bottom-1 w-[calc(33.333%-2px)] rounded-full transition-all duration-300",
              type === "expense" && "left-1 bg-destructive/15",
              type === "income" && "left-[33.333%] bg-primary/20",
              type === "transfer" && "left-[66.666%] bg-muted",
            )}
          />
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                if (t === "income") setCategory("Salary");
                else if (t === "expense") setCategory("Food");
              }}
              className={cn(
                "relative z-10 rounded-full text-sm font-semibold capitalize transition-colors",
                type === t
                  ? t === "expense"
                    ? "text-destructive"
                    : t === "income"
                      ? "text-primary"
                      : "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-4 min-[380px]:px-5 mt-3">
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex min-h-16 w-full items-center gap-3 rounded-3xl border border-primary/15 bg-primary/10 px-4 text-left shadow-sm active:scale-[0.99] transition"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <ScanLine className="size-5 text-primary-foreground" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Scan receipt</span>
            <span className="block text-xs text-muted-foreground">
              Upload a receipt and review the extracted details.
            </span>
          </span>
        </button>
      </div>

      <form
        onSubmit={submit}
        className="flex-1 overflow-y-auto overscroll-contain px-4 min-[380px]:px-5 mt-4 min-[380px]:mt-5 scroll-pb-36 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        {/* Amount */}
        <div className="text-center py-3 min-[380px]:py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount</p>
          <div className="mt-3 flex min-w-0 items-baseline justify-center gap-2">
            <span className={cn("font-display text-3xl", typeColor)}>৳</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                setError(null);
              }}
              placeholder="0"
              autoFocus
              enterKeyHint="done"
              className={cn(
                "min-w-0 bg-transparent outline-none font-display text-[clamp(3rem,17vw,4.5rem)] font-bold tabular text-center w-full max-w-[14rem] placeholder:text-muted-foreground/40",
                typeColor,
              )}
            />
          </div>
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>

        {/* Category (not for transfer) */}
        {type !== "transfer" && (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Category</p>
            <button
              type="button"
              onClick={() => setCatOpen(true)}
              className="glass w-full rounded-2xl px-3 h-14 flex items-center gap-3"
            >
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in oklch, ${cat.color} 22%, transparent)` }}
              >
                <CatIcon className="size-5" style={{ color: cat.color }} />
              </div>
              <span className="flex-1 text-left text-sm font-semibold">{category}</span>
              <span className="text-xs text-muted-foreground">Change</span>
            </button>
          </div>
        )}

        {/* Date */}
        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Date</p>
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Accounts */}
        {type === "transfer" ? (
          <>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                From account
              </p>
              <AccountSelect
                accounts={accounts}
                value={fromId}
                onChange={setFromId}
                exclude={toId}
              />
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                To account
              </p>
              <AccountSelect accounts={accounts} value={toId} onChange={setToId} exclude={fromId} />
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Account</p>
            <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
          </div>
        )}

        {/* Note */}
        <label className="mt-4 block scroll-mb-36">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Note (optional)
          </span>
          <input
            ref={noteRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => {
              setNoteFocused(true);
              keepNoteVisible();
            }}
            onBlur={() => window.setTimeout(() => setNoteFocused(false), 120)}
            maxLength={120}
            placeholder="What was this for?"
            enterKeyHint="done"
            className="glass mt-2 rounded-2xl px-4 h-12 w-full text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {showNoteSuggestions && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {noteSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setNote(suggestion);
                    noteRef.current?.focus();
                  }}
                  className="glass h-9 max-w-[16rem] shrink-0 truncate rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  title={suggestion}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Receipt image (optional)
          </p>
          {receiptImage ? (
            <div className="glass overflow-hidden rounded-2xl">
              <img
                src={receiptImage}
                alt="Attached receipt"
                className="max-h-56 w-full object-cover"
              />
              <div className="flex gap-2 p-2">
                <button
                  type="button"
                  onClick={() => receiptRef.current?.click()}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-muted text-xs font-semibold"
                >
                  <ImagePlus className="size-4" />
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptImage(undefined)}
                  className="flex h-10 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-destructive"
                  aria-label="Remove receipt"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => receiptRef.current?.click()}
              className="glass flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-primary"
            >
              <ImagePlus className="size-5" />
              Upload receipt image
            </button>
          )}
          <input
            ref={receiptRef}
            type="file"
            accept="image/*"
            onChange={(e) => attachReceipt(e.target.files?.[0])}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] mt-6 min-h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-glow flex w-full items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Check className="size-5" />
          {editing ? "Save changes" : "Save transaction"}
        </button>
      </form>

      <CategoryPicker
        open={catOpen}
        onClose={() => setCatOpen(false)}
        value={category}
        onChange={setCategory}
        type={type === "income" ? "income" : "expense"}
      />

      {scannerOpen && (
        <ReceiptScanner
          accounts={accounts}
          customCategories={custom}
          currency={currency}
          onClose={() => setScannerOpen(false)}
          onSaved={() => navigate({ to: "/" })}
        />
      )}
    </div>
  );
}

function suggestNotes(
  transactions: Transaction[],
  {
    category,
    type,
    query,
    editingId,
  }: { category: string; type: TxType; query: string; editingId?: string },
) {
  if (type === "transfer") return [];

  const normalizedQuery = normalizeNote(query);
  const suggestions = new Map<
    string,
    {
      note: string;
      count: number;
      categoryMatches: number;
      merchantMatches: number;
      bestScore: number;
      lastSeen: number;
    }
  >();

  transactions.forEach((transaction, index) => {
    if (transaction.id === editingId || transaction.type !== type) return;

    const note = transaction.note?.trim();
    const merchant = transaction.merchant?.trim();
    const suggestion = note || merchant;
    if (!suggestion) return;

    const key = normalizeNote(suggestion);
    if (!key || key === normalizedQuery) return;

    const categoryKey = normalizeNote(transaction.category);
    const merchantKey = normalizeNote(merchant || "");
    const sameCategory = transaction.category === category;
    const queryHitsNote = Boolean(normalizedQuery && key.includes(normalizedQuery));
    const queryHitsMerchant = Boolean(normalizedQuery && merchantKey.includes(normalizedQuery));
    const queryHitsCategory = Boolean(normalizedQuery && categoryKey.includes(normalizedQuery));

    if (!sameCategory && (!normalizedQuery || (!queryHitsNote && !queryHitsMerchant))) return;

    const current = suggestions.get(key);
    const startsNote = normalizedQuery && key.startsWith(normalizedQuery);
    const startsMerchant = normalizedQuery && merchantKey.startsWith(normalizedQuery);
    const score =
      (sameCategory ? 80 : 0) +
      (startsNote ? 45 : queryHitsNote ? 28 : 0) +
      (startsMerchant ? 38 : queryHitsMerchant ? 24 : 0) +
      (queryHitsCategory ? 10 : 0) +
      (merchant ? 6 : 0) +
      Math.max(0, 12 - index);

    suggestions.set(key, {
      note: current?.note || suggestion,
      count: (current?.count || 0) + 1,
      categoryMatches: (current?.categoryMatches || 0) + (sameCategory ? 1 : 0),
      merchantMatches: (current?.merchantMatches || 0) + (queryHitsMerchant ? 1 : 0),
      bestScore: Math.max(current?.bestScore || 0, score),
      lastSeen: current ? Math.min(current.lastSeen, index) : index,
    });
  });

  return Array.from(suggestions.values())
    .sort((a, b) => {
      return (
        b.bestScore - a.bestScore ||
        b.categoryMatches - a.categoryMatches ||
        b.merchantMatches - a.merchantMatches ||
        b.count - a.count ||
        a.lastSeen - b.lastSeen
      );
    })
    .slice(0, 5)
    .map(({ note }) => note);
}

function normalizeNote(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function suggestRecurringBill({
  current,
  transactions,
  bills,
}: {
  current: Omit<Transaction, "id">;
  transactions: Transaction[];
  bills: Bill[];
}) {
  if (current.type !== "expense" || !current.accountId) return;

  const currentName = billNameFromTransaction(current);
  const currentKey = normalizeNote(currentName);
  if (!currentKey) return;

  const amountTolerance = Math.max(50, current.amount * 0.08);
  const matches = transactions
    .filter((transaction) => {
      if (transaction.type !== "expense") return false;
      if (transaction.category !== current.category) return false;
      if (Math.abs(transaction.amount - current.amount) > amountTolerance) return false;
      return normalizeNote(billNameFromTransaction(transaction)) === currentKey;
    })
    .map((transaction) => transaction.date);

  if (matches.length < 2) return;

  const dates = [...matches, current.date]
    .map((date) => new Date(date))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const repeat = detectRepeat(dates);
  if (!repeat) return;

  const duplicate = bills.some((bill) => {
    const active = !bill.history && bill.repeat !== "none";
    return (
      active &&
      bill.category === current.category &&
      bill.repeat === repeat &&
      normalizeNote(bill.name) === currentKey
    );
  });
  if (duplicate) return;

  const nextDate = nextRecurringDate(new Date(current.date), repeat);

  toast.info("Looks recurring", {
    description: `${currentName} seems ${repeat}. Add it as a bill?`,
    action: {
      label: "Add bill",
      onClick: () => {
        store.addBill({
          name: currentName,
          amount: current.amount,
          dueDate: nextDate.toISOString(),
          nextDueDate: nextDate.toISOString(),
          repeat,
          accountId: current.accountId,
          category: current.category,
          notes: current.note,
        });
        toast.success("Bill reminder created", {
          description: `${currentName} is now on your bill calendar.`,
        });
      },
    },
  });
}

function billNameFromTransaction(transaction: Pick<Transaction, "category" | "note">) {
  return transaction.note?.trim() || transaction.category;
}

function detectRepeat(dates: Date[]): Extract<Bill["repeat"], "weekly" | "monthly"> | null {
  if (dates.length < 3) return null;

  const gaps = dates.slice(1).map((date, index) => daysBetween(dates[index], date));
  const recentGaps = gaps.slice(-3);
  const average = recentGaps.reduce((sum, gap) => sum + gap, 0) / recentGaps.length;

  if (average >= 5 && average <= 9 && recentGaps.every((gap) => gap >= 4 && gap <= 10)) {
    return "weekly";
  }
  if (average >= 25 && average <= 35 && recentGaps.every((gap) => gap >= 21 && gap <= 40)) {
    return "monthly";
  }

  return null;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function nextRecurringDate(date: Date, repeat: Extract<Bill["repeat"], "weekly" | "monthly">) {
  const next = new Date(date);
  if (repeat === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function alertUnusualTransaction({
  current,
  transactions,
  currency,
}: {
  current: Omit<Transaction, "id">;
  transactions: Transaction[];
  currency: string;
}) {
  if (current.type !== "expense") return;

  const categoryAmounts = transactions
    .filter(
      (transaction) =>
        transaction.type === current.type &&
        transaction.category === current.category &&
        transaction.amount > 0,
    )
    .map((transaction) => transaction.amount);

  if (categoryAmounts.length < 5) return;

  const usual = median(categoryAmounts);
  const highEnough = current.amount >= usual * 2.2;
  const meaningfulDifference = current.amount - usual >= Math.max(500, usual * 0.8);
  if (!highEnough || !meaningfulDifference) return;

  toast.warning("Unusual transaction", {
    description: `${formatMoney(current.amount, currency)} is higher than your usual ${current.category} spend of about ${formatMoney(usual, currency)}.`,
  });
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
