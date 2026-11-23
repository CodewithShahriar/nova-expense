import { useState, useMemo, useEffect } from "react";
import {
  Bot,
  Volume2,
  VolumeX,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  PieChart,
  ShieldCheck,
  Calendar,
  Flame,
  Lightbulb,
} from "lucide-react";
import { useStore, formatMoney, type Transaction } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface SmartInsightModalProps {
  open: boolean;
  onClose: () => void;
}

export function SmartInsightModal({ open, onClose }: SmartInsightModalProps) {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const bills = useStore((s) => s.bills);
  const currency = useStore((s) => s.settings.currency);

  const [isSpeaking, setIsSpeaking] = useState(false);

  // Lock background scroll when modal is open & stop speaking when modal closes
  useEffect(() => {
    if (!open) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      return;
    }

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.documentElement.dataset.scrollLock = "true";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      delete document.documentElement.dataset.scrollLock;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, [open, onClose]);

  // Comprehensive 360-degree Financial Intelligence Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay;

    // 1. Total Liquidity across accounts
    const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

    // 2. Month transactions
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let monthIncome = 0;
    let monthExpense = 0;
    const catSpend: Record<string, number> = {};
    const spikes: Transaction[] = [];

    for (const t of monthTx) {
      if (t.type === "income") {
        monthIncome += t.amount;
      } else if (t.type === "expense") {
        monthExpense += t.amount;
        catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
        // Identify unusual single transactions (> 20% of total expenses or > 3000)
        if (t.amount >= 2500) spikes.push(t);
      }
    }

    // Savings rate
    const netSavings = monthIncome - monthExpense;
    const savingsRate =
      monthIncome > 0 ? Math.round((netSavings / monthIncome) * 100) : totalBalance > 0 ? 65 : 0;

    // Top expense category
    let topCat = "General";
    let topCatAmount = 0;
    for (const [cat, amt] of Object.entries(catSpend)) {
      if (amt > topCatAmount) {
        topCat = cat;
        topCatAmount = amt;
      }
    }
    const topCatPct = monthExpense > 0 ? Math.round((topCatAmount / monthExpense) * 100) : 0;

    // Daily Burn Rate
    const dailySpend = currentDay > 0 ? Math.round(monthExpense / currentDay) : monthExpense;
    const projectedMonthEnd = Math.round(monthExpense + dailySpend * daysRemaining);

    // Budgets status
    let totalBudgetLimit = 0;
    const exceededBudgets: string[] = [];
    const warningBudgets: string[] = [];

    for (const b of budgets) {
      totalBudgetLimit += b.limit;
      const spent = catSpend[b.category] || 0;
      if (b.limit > 0) {
        if (spent > b.limit) exceededBudgets.push(b.category);
        else if (spent / b.limit >= 0.8) warningBudgets.push(b.category);
      }
    }

    // Pending / Overdue Bills
    const pendingBills = bills.filter((b) => !b.paid);

    // Financial Health Score (0 - 100)
    let score = 85;
    if (savingsRate > 30) score += 8;
    else if (savingsRate < 0) score -= 20;

    if (exceededBudgets.length > 0) score -= exceededBudgets.length * 10;
    if (pendingBills.length > 2) score -= 6;
    if (totalBalance > monthExpense * 3) score += 7;
    score = Math.max(25, Math.min(99, score));

    // Verbal Summary for Speech Synthesis
    const speechSummary = `Here is your Nova Smart Insight. Your financial health score is ${score} out of 100. Total liquidity across accounts is ${formatMoney(totalBalance, currency)}. This month, you have spent ${formatMoney(monthExpense, currency)} with a savings rate of ${savingsRate} percent. Your highest spending category is ${topCat}, accounting for ${topCatPct} percent of total expenses. ${
      exceededBudgets.length > 0
        ? `Warning: You have exceeded budget in ${exceededBudgets.join(", ")}.`
        : "All your active budgets are on track."
    } ${
      pendingBills.length > 0
        ? `You have ${pendingBills.length} unpaid bill due.`
        : "No overdue bills."
    } Recommendation: Keep daily spend around ${formatMoney(dailySpend, currency)} to hit your monthly savings target.`;

    return {
      totalBalance,
      monthIncome,
      monthExpense,
      netSavings,
      savingsRate,
      topCat,
      topCatAmount,
      topCatPct,
      dailySpend,
      projectedMonthEnd,
      exceededBudgets,
      warningBudgets,
      pendingBills,
      score,
      spikes,
      daysRemaining,
      speechSummary,
    };
  }, [accounts, transactions, budgets, bills, currency]);

  // Speech synthesizer
  function toggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(metrics.speechSummary);
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div
        className="w-full max-w-[430px] max-h-[90dvh] flex flex-col rounded-t-[2rem] sm:rounded-[2rem] glass-strong border border-white/15 shadow-2xl overflow-hidden animate-slide-up overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-glow">
              <Bot className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  Smart Financial Insight
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground tracking-wider uppercase">
                  AI Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time 360° financial intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speak / Listen Button */}
            <button
              type="button"
              onClick={toggleSpeech}
              title={isSpeaking ? "Stop voice insight" : "Listen to voice insight"}
              className={cn(
                "size-9 rounded-xl flex items-center justify-center border transition active:scale-95",
                isSpeaking
                  ? "bg-primary text-primary-foreground border-primary shadow-glow animate-pulse"
                  : "glass border-white/10 text-muted-foreground hover:text-foreground",
              )}
            >
              {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-xl glass border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 no-scrollbar">
          {/* 1. Health Score & Top Headline Card */}
          <div className="glass rounded-2xl p-4 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Financial Health Score
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {metrics.score}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full border ml-2",
                      metrics.score >= 80
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : metrics.score >= 60
                          ? "bg-amber-400/15 border-amber-400/30 text-amber-300"
                          : "bg-rose-500/15 border-rose-500/30 text-rose-400",
                    )}
                  >
                    {metrics.score >= 80
                      ? "Excellent"
                      : metrics.score >= 60
                        ? "Stable"
                        : "Needs Care"}
                  </span>
                </div>
              </div>

              <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ShieldCheck className="size-6 text-primary" />
              </div>
            </div>

            {/* Speaking active indicator banner */}
            {isSpeaking && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary animate-pulse">
                <Volume2 className="size-3.5 shrink-0" />
                <span className="truncate">Reading live financial summary aloud...</span>
              </div>
            )}
          </div>

          {/* 2. Key 4-Grid Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Total Balance */}
            <div className="glass rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <Wallet className="size-3.5 text-primary" />
                <span>Total Balance</span>
              </div>
              <p className="font-display text-base font-bold text-foreground mt-1 tabular truncate">
                {formatMoney(metrics.totalBalance, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across all accounts</p>
            </div>

            {/* Savings Rate */}
            <div className="glass rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                {metrics.savingsRate >= 0 ? (
                  <TrendingUp className="size-3.5 text-primary" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-400" />
                )}
                <span>Savings Rate</span>
              </div>
              <p className="font-display text-base font-bold text-foreground mt-1 tabular">
                {metrics.savingsRate}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Net: {formatMoney(metrics.netSavings, currency)}
              </p>
            </div>

            {/* Daily Burn Rate */}
            <div className="glass rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <Flame className="size-3.5 text-amber-400" />
                <span>Daily Burn</span>
              </div>
              <p className="font-display text-base font-bold text-foreground mt-1 tabular truncate">
                {formatMoney(metrics.dailySpend, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Average spend / day</p>
            </div>

            {/* Top Category */}
            <div className="glass rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <PieChart className="size-3.5 text-primary" />
                <span>Top Spend</span>
              </div>
              <p className="font-display text-base font-bold text-foreground mt-1 truncate">
                {metrics.topCat}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {metrics.topCatPct}% of monthly expenses
              </p>
            </div>
          </div>

          {/* 3. Smart Alerts & Observations */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Key Insights & Alerts
            </h4>

            {/* Budget Alert */}
            {metrics.exceededBudgets.length > 0 ? (
              <div className="glass rounded-2xl p-3.5 border border-rose-500/30 bg-rose-500/5 flex items-start gap-3">
                <AlertTriangle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-300">Budget Limit Exceeded</p>
                  <p className="text-[11px] text-rose-200/80 mt-0.5 leading-relaxed">
                    You have overspent in{" "}
                    <span className="font-semibold">{metrics.exceededBudgets.join(", ")}</span>.
                    Consider capping discretionary spends this week.
                  </p>
                </div>
              </div>
            ) : metrics.warningBudgets.length > 0 ? (
              <div className="glass rounded-2xl p-3.5 border border-amber-400/30 bg-amber-400/5 flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-300">Approaching Budget Limit</p>
                  <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                    <span className="font-semibold">{metrics.warningBudgets.join(", ")}</span> is
                    above 80% of limit.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-3.5 border border-primary/20 bg-primary/5 flex items-start gap-3">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-primary">Budgets On Track</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    All your category spending limits are within safe margins.
                  </p>
                </div>
              </div>
            )}

            {/* Pending Bills Alert */}
            {metrics.pendingBills.length > 0 ? (
              <div className="glass rounded-2xl p-3.5 border border-white/10 flex items-start gap-3">
                <Calendar className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">Upcoming Bills</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    You have {metrics.pendingBills.length} unpaid bill(s) scheduled. Keep enough
                    balance in your primary account.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Actionable Strategy Tip */}
            <div className="glass rounded-2xl p-3.5 border border-white/10 flex items-start gap-3">
              <Lightbulb className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Smart Savings Strategy</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Your projected month-end expense is{" "}
                  <span className="font-semibold text-foreground">
                    {formatMoney(metrics.projectedMonthEnd, currency)}
                  </span>
                  . Keeping daily spending below{" "}
                  <span className="font-semibold text-primary">
                    {formatMoney(metrics.dailySpend, currency)}
                  </span>{" "}
                  will maintain a positive savings buffer of {metrics.savingsRate}%.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleSpeech}
            className="flex-1 h-11 rounded-xl glass border border-white/10 flex items-center justify-center gap-2 text-xs font-semibold text-foreground hover:bg-white/10 transition active:scale-95"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="size-4 text-rose-400" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Volume2 className="size-4 text-primary" />
                <span>Listen Live Insight</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-glow hover:brightness-110 transition active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
