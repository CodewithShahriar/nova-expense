import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  CreditCard,
  Bell,
  Plus,
  User,
  Coffee,
  Car,
  ShoppingBag,
  Briefcase,
  UtensilsCrossed,
  Clapperboard,
  Receipt,
  HeartPulse,
  Laptop,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { useStore, store, formatMoney, type Transaction, type CustomCategory } from "@/lib/storage";
import { StackedCardDeck } from "@/components/StackedCardDeck";
import { GlassCard } from "@/components/GlassCard";
import { SmartInsightModal } from "@/components/SmartInsightModal";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function getTransactionIcon(t: Transaction, custom: CustomCategory[]): LucideIcon {
  const note = (t.note || "").toLowerCase();
  const catName = (t.category || "").toLowerCase();
  const merchant = (t.merchant || "").toLowerCase();

  // Smart matching for suitable, realistic icons
  if (
    note.includes("coffee") ||
    note.includes("cafe") ||
    note.includes("starbucks") ||
    note.includes("tea")
  ) {
    return Coffee;
  }
  if (
    note.includes("uber") ||
    note.includes("ride") ||
    note.includes("taxi") ||
    catName === "transport"
  ) {
    return Car;
  }
  if (
    note.includes("shoe") ||
    note.includes("cloth") ||
    note.includes("grocer") ||
    catName === "shopping"
  ) {
    return ShoppingBag;
  }
  if (note.includes("salary") || catName === "salary") {
    return Briefcase;
  }
  if (
    note.includes("dinner") ||
    note.includes("lunch") ||
    note.includes("food") ||
    note.includes("snack") ||
    catName === "food"
  ) {
    return UtensilsCrossed;
  }
  if (note.includes("netflix") || note.includes("movie") || catName === "entertainment") {
    return Clapperboard;
  }
  if (
    note.includes("bill") ||
    note.includes("electric") ||
    note.includes("server") ||
    catName === "bills"
  ) {
    return Receipt;
  }
  if (note.includes("pharmacy") || note.includes("doctor") || catName === "health") {
    return HeartPulse;
  }
  if (
    note.includes("gig") ||
    note.includes("freelance") ||
    note.includes("tech") ||
    catName === "freelance"
  ) {
    return Laptop;
  }
  if (t.type === "transfer" || catName === "transfer") {
    return ArrowLeftRight;
  }
  if (
    note.includes("james") ||
    note.includes("michael") ||
    note.includes("maisha") ||
    merchant.includes("james")
  ) {
    return User;
  }

  // Fallback to registered category icon
  const cat = getCategory(t.category, custom);
  return cat?.icon || (t.type === "income" ? ArrowUp : ArrowDown);
}

function Dashboard() {
  const navigate = useNavigate();
  const [insightOpen, setInsightOpen] = useState(false);
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customCategories);
  const currency = settings.currency;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const recent = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateDiff = +new Date(b.date) - +new Date(a.date);
        return dateDiff || +new Date(b.createdAt || b.date) - +new Date(a.createdAt || a.date);
      })
      .slice(0, 6);
  }, [transactions]);

  const initials = (settings.name || "Sajibur Rahman")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) map.set(a.id, a.name || a.brand || "Card");
    return map;
  }, [accounts]);

  function loadSampleData() {
    const loaded = store.seedDemo();
    if (loaded) {
      toast.success("Sample data loaded", {
        description: "Demo accounts and transactions are ready.",
      });
      return;
    }
    toast.info("Sample data is already loaded");
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      {/* 1. Top Bar: Avatar + Greeting & Name on Left, Notification Bell on Right */}
      <div className="flex items-center justify-between mb-4 px-4 min-[380px]:px-5">
        <Link to="/settings" className="flex items-center gap-3 active:scale-[0.98] transition">
          {settings.avatar ? (
            <img
              src={settings.avatar}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-white/10 shadow-card"
            />
          ) : (
            <div className="size-11 rounded-full glass border border-white/15 flex items-center justify-center text-foreground shadow-card">
              <span className="font-display text-sm font-bold">
                {initials || <User className="size-5" />}
              </span>
            </div>
          )}
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {greeting}
            </p>
            <p className="font-display text-base font-bold text-foreground mt-0.5 truncate max-w-[190px]">
              {settings.name || "Sajibur Rahman"}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setInsightOpen(true)}
          aria-label="Smart Financial Insight"
          title="Smart Financial Insight"
          className="size-11 rounded-full glass flex items-center justify-center text-foreground hover:text-primary active:scale-95 transition relative shadow-card border border-white/10 group"
        >
          <Bot className="size-5.5 stroke-[2.2] transition group-hover:scale-110 text-primary" />
          <span className="size-2 rounded-full bg-primary absolute top-2 right-2 shadow-glow animate-pulse" />
        </button>
      </div>

      {/* 2. "My Cards" Section Header */}
      <div className="flex items-center justify-between mb-1 px-4 min-[380px]:px-5">
        <h2 className="font-display text-base min-[380px]:text-lg font-bold text-foreground">
          My Cards
        </h2>
        <Link
          to="/accounts"
          className="glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 active:scale-95 transition border border-white/10 shadow-xs"
        >
          <span>Add Card</span>
          <Plus className="size-3.5 stroke-[2.5]" />
        </Link>
      </div>

      {/* 3. Stacked Cards Deck (One behind another, clicking on back card brings it to front) */}
      <StackedCardDeck
        accounts={accounts}
        currency={currency}
        onCardClick={(acc) => navigate({ to: "/accounts/$id", params: { id: acc.id } })}
      />

      {/* 4. 4 Quick Action Buttons: Deposit, Withdrawal, Transfer, Cards */}
      <div className="grid grid-cols-4 gap-2.5 min-[380px]:gap-3 mt-4 px-4 min-[380px]:px-5">
        {/* Deposit */}
        <Link
          to="/add"
          search={{ type: "income", scan: undefined, edit: undefined }}
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card border border-white/10 group"
        >
          <div className="size-11 rounded-full glass flex items-center justify-center text-foreground border border-white/10 transition group-hover:scale-105">
            <ArrowUp className="size-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Deposit
          </span>
        </Link>

        {/* Withdrawal */}
        <Link
          to="/add"
          search={{ type: "expense", scan: undefined, edit: undefined }}
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card border border-white/10 group"
        >
          <div className="size-11 rounded-full glass flex items-center justify-center text-foreground border border-white/10 transition group-hover:scale-105">
            <ArrowDown className="size-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Withdrawal
          </span>
        </Link>

        {/* Transfer (loan er poriborte transfer) */}
        <Link
          to="/add"
          search={{ type: "transfer", scan: undefined, edit: undefined }}
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card border border-white/10 group"
        >
          <div className="size-11 rounded-full glass flex items-center justify-center text-foreground border border-white/10 transition group-hover:scale-105">
            <ArrowLeftRight className="size-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Transfer
          </span>
        </Link>

        {/* Cards (rent er poriborte cards) */}
        <Link
          to="/accounts"
          className="glass rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition shadow-card border border-white/10 group"
        >
          <div className="size-11 rounded-full glass flex items-center justify-center text-foreground border border-white/10 transition group-hover:scale-105">
            <CreditCard className="size-5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">
            Cards
          </span>
        </Link>
      </div>

      {/* 5. Transactions Section (Directly below action buttons with suitable descriptive icons) */}
      <div className="px-4 min-[380px]:px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base min-[380px]:text-lg font-bold text-foreground">
            Transactions
          </h2>
          <Link
            to="/transactions"
            className="text-xs text-muted-foreground hover:text-primary font-medium transition"
          >
            View All
          </Link>
        </div>

        <div className="space-y-2.5">
          {recent.length === 0 ? (
            <GlassCard className="text-center py-8 border-white/10">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <button
                type="button"
                onClick={loadSampleData}
                className="mt-3 inline-flex rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition"
              >
                Load Sample Data
              </button>
            </GlassCard>
          ) : (
            recent.map((t) => {
              const isIncome = t.type === "income";
              const isTransfer = t.type === "transfer";
              const Icon = getTransactionIcon(t, custom);

              const accountLabel = isTransfer
                ? `${accountMap.get(t.fromAccountId || "") || "Card"} → ${accountMap.get(t.toAccountId || "") || "Account"}`
                : accountMap.get(t.accountId || "") || accounts[0]?.name || "Visa";

              const displayTitle =
                t.merchant || t.note || t.category || (isTransfer ? "Transfer" : "Transaction");

              const noteText =
                displayTitle === t.merchant
                  ? t.note
                  : displayTitle === t.note
                    ? t.category &&
                      t.category !== displayTitle &&
                      t.category !== "Expense" &&
                      t.category !== "Other"
                      ? t.category
                      : undefined
                    : t.note;

              const timeStr = new Date(t.date).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={t.id}
                  className="glass rounded-2xl p-3.5 flex items-center gap-3.5 border border-white/10 transition hover:bg-white/[0.04]"
                >
                  {/* Meaningful suitable icon in frosted glass circle */}
                  <div className="size-11 rounded-full glass border border-white/15 flex items-center justify-center shrink-0 text-foreground shadow-xs">
                    <Icon className="size-5 stroke-[2.2] text-foreground" />
                  </div>

                  {/* Merchant / Description & Subtitle (Note + Account + Time) */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{displayTitle}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                      {noteText && (
                        <>
                          <span className="text-foreground/90 font-medium truncate max-w-[120px]">
                            {noteText}
                          </span>
                          <span className="text-muted-foreground/40 shrink-0">•</span>
                        </>
                      )}
                      <span className="text-muted-foreground truncate max-w-[130px]">
                        {accountLabel}
                      </span>
                      <span className="text-muted-foreground/40 shrink-0">•</span>
                      <span className="shrink-0">{timeStr}</span>
                    </p>
                  </div>

                  {/* Amount only (nothing below it) */}
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "font-display text-sm min-[380px]:text-base font-bold tabular",
                        isIncome ? "text-primary" : "text-foreground",
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {formatMoney(t.amount, currency).replace("-", "")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top-Level Real-Time Smart Insight Engine & Voice Modal */}
      <SmartInsightModal open={insightOpen} onClose={() => setInsightOpen(false)} />
    </div>
  );
}
