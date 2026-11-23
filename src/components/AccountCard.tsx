import { useState } from "react";
import { type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/storage";
import { Wifi, Eye, EyeOff } from "lucide-react";

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
  const [showNumber, setShowNumber] = useState(false);

  const isNeon =
    account.gradient?.includes("#C6F432") ||
    account.gradient?.includes("#D4FF00") ||
    account.gradient?.includes("#D6F92B") ||
    account.gradient?.includes("#C4F32A") ||
    account.order === 0;

  const displayGradient =
    isNeon && (!account.gradient || account.gradient.includes("oklch"))
      ? "linear-gradient(135deg, #D6F92B 0%, #C4F32A 55%, #A4E316 100%)"
      : account.gradient;

  const displayBrand = account.brand || (isNeon ? "VISA" : account.type.toUpperCase());
  const rawNumber = account.number || "•••• •••• 5466";
  const maskedNumber = showNumber
    ? rawNumber
    : rawNumber.length > 4
      ? `•••• •••• ${rawNumber.replace(/\D/g, "").slice(-4) || "5466"}`
      : rawNumber;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full min-w-0 text-left rounded-[1.8rem] min-[380px]:rounded-[2rem] overflow-hidden shadow-elegant transition-all active:scale-[0.985] select-none group",
        compact ? "aspect-[16/9]" : "aspect-[1.586/1]",
        isNeon ? "text-zinc-950 font-sans" : "text-white",
        className,
      )}
      style={{ background: displayGradient }}
    >
      {/* Subtle card lighting / wave texture */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity",
          isNeon ? "opacity-35" : "opacity-40",
        )}
        style={{
          background: isNeon
            ? "radial-gradient(100% 70% at 100% 0%, rgba(255,255,255,0.4) 0%, transparent 60%), radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,0.12) 0%, transparent 70%)"
            : "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.25), transparent 60%)",
        }}
      />
      {isNeon && (
        <div
          className="absolute -right-10 -bottom-10 size-48 rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #8bc34a 0%, transparent 70%)" }}
        />
      )}

      <div className="relative h-full p-5 min-[380px]:p-6 flex flex-col justify-between">
        {/* Top Header: Brand & Contactless Wifi */}
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                "font-display text-xl min-[380px]:text-2xl font-black italic tracking-tighter uppercase",
                isNeon ? "text-zinc-950" : "text-white",
              )}
            >
              {displayBrand}
            </span>
          </div>

          <Wifi
            className={cn(
              "size-5 min-[380px]:size-6 shrink-0 rotate-90 stroke-[2.4]",
              isNeon ? "text-zinc-950/85" : "text-white/80",
            )}
          />
        </div>

        {/* Middle: Masked card number with eye toggle */}
        <div className="flex items-center gap-2 mt-auto pb-2">
          <p
            className={cn(
              "font-display text-xs min-[380px]:text-sm tracking-[0.2em] tabular font-medium",
              isNeon ? "text-zinc-950/80" : "text-white/80",
            )}
          >
            {maskedNumber}
          </p>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setShowNumber(!showNumber);
            }}
            className={cn(
              "p-1 rounded-full transition hover:scale-110 active:scale-95 cursor-pointer",
              isNeon ? "hover:bg-black/10 text-zinc-950/70" : "hover:bg-white/10 text-white/70",
            )}
            title={showNumber ? "Hide number" : "Show number"}
          >
            {showNumber ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </span>
        </div>

        {/* Bottom row: Balance & EMV Chip */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[10px] min-[380px]:text-[11px] font-semibold uppercase tracking-[0.16em]",
                isNeon ? "text-zinc-950/65" : "text-white/60",
              )}
            >
              Balance
            </p>
            <p
              className={cn(
                "truncate font-display text-xl min-[380px]:text-2xl min-[430px]:text-3xl font-extrabold tracking-tight tabular mt-0.5",
                isNeon ? "text-zinc-950" : "text-white",
              )}
            >
              {formatMoney(account.balance, currency)}
            </p>
          </div>

          {/* EMV Chip */}
          <div
            className={cn(
              "size-9 min-[380px]:size-10 rounded-lg p-1 shrink-0 relative overflow-hidden border shadow-xs flex items-center justify-center",
              isNeon
                ? "bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-amber-400/60"
                : "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 border-amber-300/40",
            )}
          >
            <div className="w-full h-[1px] bg-amber-900/40 absolute" />
            <div className="h-full w-[1px] bg-amber-900/40 absolute" />
            <div className="size-4 rounded-xs border border-amber-900/40" />
          </div>
        </div>
      </div>
    </button>
  );
}
