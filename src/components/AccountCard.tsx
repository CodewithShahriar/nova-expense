import { type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/storage";
import { Wifi } from "lucide-react";

export function AccountCard({
  account,
  currency,
  className,
  compact = false,
  onClick,
}: {
  account: Account;
  currency: string;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full text-left rounded-3xl overflow-hidden shadow-elegant text-white",
        compact ? "aspect-[16/9]" : "aspect-[1.586/1]",
        className,
      )}
      style={{ background: account.gradient }}
    >
      {/* shine */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.25), transparent 60%)" }} />
      <div className="absolute -bottom-8 -left-8 size-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative h-full p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{account.brand || account.type}</p>
            <p className="mt-1 font-display text-lg font-semibold">{account.name}</p>
          </div>
          <Wifi className="size-5 rotate-90 text-white/80" />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Balance</p>
          <p className="font-display text-2xl font-bold tabular">{formatMoney(account.balance, currency)}</p>
          <p className="mt-2 text-xs tabular tracking-wider text-white/80">{account.number || "— — —"}</p>
        </div>
      </div>
    </button>
  );
}
