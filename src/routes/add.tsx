import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Check, ScanLine } from "lucide-react";
import { store, useStore, type TxType } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { CategoryPicker } from "@/components/CategoryPicker";
import { DatePicker } from "@/components/DatePicker";
import { AccountSelect } from "@/components/AccountSelect";
import { ReceiptScanner } from "@/components/ReceiptScanner";

export const Route = createFileRoute("/add")({
  validateSearch: (search: Record<string, unknown>) => ({
    type:
      search.type === "income" || search.type === "expense" || search.type === "transfer"
        ? search.type
        : undefined,
    scan: search.scan === "receipt" ? "receipt" : undefined,
  }),
  component: AddTransaction,
});

function AddTransaction() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const currency = useStore((s) => s.settings.currency);
  const accounts = useStore((s) => s.accounts);
  const custom = useStore((s) => s.customCategories);

  const initialType = (search.type || "expense") as TxType;
  const [type, setType] = useState<TxType>(initialType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(initialType === "income" ? "Salary" : "Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString());
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");
  const [fromId, setFromId] = useState<string>(accounts[0]?.id || "");
  const [toId, setToId] = useState<string>(accounts[1]?.id || accounts[0]?.id || "");
  const [catOpen, setCatOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  const cat = getCategory(category, custom);
  const CatIcon = cat.icon;

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
      store.addTransaction({
        type,
        amount: value,
        category: "Transfer",
        note: note.trim() || undefined,
        date,
        fromAccountId: fromId,
        toAccountId: toId,
      });
    } else {
      if (!category) {
        setError("Pick a category");
        return;
      }
      if (!accountId) {
        setError("Select an account");
        return;
      }
      store.addTransaction({
        type,
        amount: value,
        category,
        note: note.trim() || undefined,
        date,
        accountId,
      });
    }
    navigate({ to: "/" });
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
        <h1 className="font-semibold">New transaction</h1>
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
            onFocus={keepNoteVisible}
            maxLength={120}
            placeholder="What was this for?"
            enterKeyHint="done"
            className="glass mt-2 rounded-2xl px-4 h-12 w-full text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </label>

        <button
          type="submit"
          className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] mt-6 min-h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-glow flex w-full items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Check className="size-5" />
          Save transaction
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
