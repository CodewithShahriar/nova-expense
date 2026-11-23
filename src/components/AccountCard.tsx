import { useState } from "react";
import { type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/storage";
import { Eye, EyeOff } from "lucide-react";
import { VisaLogo } from "@/components/VisaLogo";

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

  // By default or for primary card, use signature Neon Lime
  const isNeon =
    account.id === "acc-visa" ||
    account.gradient?.includes("#C6F432") ||
    account.gradient?.includes("#D4FF00") ||
    account.gradient?.includes("#D6F92B") ||
    account.gradient?.includes("#C4F32A") ||
    account.order === 0;

  const rawNumber = account.number || "•••• •••• •••• 5466";
  const lastFour = rawNumber.replace(/\D/g, "").slice(-4) || "5466";
  const maskedNumber = showNumber ? rawNumber : `•••• •••• •••• ${lastFour}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full min-w-0 text-left rounded-[1.8rem] min-[380px]:rounded-[2.2rem] overflow-hidden shadow-elegant transition-all duration-300 active:scale-[0.985] select-none group border border-black/10",
        compact ? "aspect-[16/9]" : "aspect-[1.586/1]",
        isNeon ? "bg-[#C6F432] text-black font-sans" : "text-white",
        className,
      )}
      style={!isNeon ? { background: account.gradient } : undefined}
    >
      {/* Subtle organic watermark rings on bottom-left (exact from reference image) */}
      <div className="absolute -left-12 -bottom-10 size-44 rounded-full border-[1.5px] border-black/10 pointer-events-none" />
      <div className="absolute left-6 -bottom-6 size-36 rounded-full border-[1.5px] border-black/10 pointer-events-none" />

      {/* Main card content container */}
      <div className="relative h-full p-5 min-[380px]:p-6 pr-22 min-[380px]:pr-24 flex flex-col justify-between">
        {/* Top-Left: VISA logo and card number with eye toggle */}
        <div className="min-w-0">
          {/* Official VISA Wordmark SVG */}
          <div className="flex items-center">
            <VisaLogo className="h-6 min-[380px]:h-7" light={!isNeon} />
          </div>

          {/* Masked card number directly below VISA */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={cn(
                "font-display text-xs min-[380px]:text-sm tracking-[0.16em] tabular font-bold",
                isNeon ? "text-black" : "text-white/90",
              )}
            >
              {maskedNumber}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowNumber(!showNumber);
              }}
              className={cn(
                "p-0.5 rounded-full transition hover:scale-110 active:scale-95 cursor-pointer",
                isNeon ? "text-black hover:bg-black/10" : "text-white/80 hover:bg-white/10",
              )}
              title={showNumber ? "Hide number" : "Show number"}
            >
              {showNumber ? <Eye className="size-4 stroke-[2.2]" /> : <EyeOff className="size-4 stroke-[2.2]" />}
            </span>
          </div>
        </div>

        {/* Bottom-Left: Balance label & Amount */}
        <div className="min-w-0 mt-auto">
          <p
            className={cn(
              "text-xs min-[380px]:text-[13px] font-semibold tracking-tight",
              isNeon ? "text-black" : "text-white/70",
            )}
          >
            Balance
          </p>
          <p
            className={cn(
              "truncate font-display text-2xl min-[380px]:text-[1.85rem] font-extrabold tracking-tight tabular mt-0.5 leading-none",
              isNeon ? "text-black" : "text-white",
            )}
          >
            {formatMoney(account.balance, currency)}
          </p>
        </div>
      </div>

      {/* Right Vertical Capsule Container (Distinct olive-lime pill from reference image) */}
      <div
        className={cn(
          "absolute right-3.5 top-3.5 bottom-3.5 w-16 min-[380px]:w-18 rounded-[1.4rem] min-[380px]:rounded-[1.6rem] flex flex-col items-center justify-between py-4 min-[380px]:py-5 px-1 border",
          isNeon
            ? "bg-[#A8DB15] border-black/10 shadow-sm"
            : "bg-white/10 border-white/10 shadow-sm",
        )}
      >
        {/* Contactless waves radiating outward: ) ) ) */}
        <div className="flex items-center justify-center pt-1">
          <svg
            className={cn("size-6 min-[380px]:size-7 stroke-[2.4]", isNeon ? "text-black" : "text-white")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
          >
            <path d="M8.5 8.5a5 5 0 0 1 0 7" />
            <path d="M12 6a8.5 8.5 0 0 1 0 12" />
            <path d="M15.5 3.5a12 12 0 0 1 0 17" />
          </svg>
        </div>

        {/* Authentic Metallic Golden EMV Chip */}
        <div
          className="w-11 min-[380px]:w-12 h-8 min-[380px]:h-8.5 rounded-[7px] border border-[#8C6207]/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.2)] relative overflow-hidden flex items-center justify-center select-none"
          style={{
            background:
              "linear-gradient(135deg, #FFE79A 0%, #F6C343 30%, #D4A017 65%, #ECC038 85%, #AA7708 100%)",
          }}
        >
          {/* Etched gold circuit lines */}
          <div className="w-full h-[1px] bg-[#6E4204]/45 absolute" />
          <div className="h-full w-[1px] bg-[#6E4204]/45 absolute" />
          <div className="w-5 h-4.5 rounded-[4px] border border-[#6E4204]/50 bg-[#FFEFA8]/35 shadow-inner" />
          <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-[#6E4204]/35" />
          <div className="absolute right-2 top-0 bottom-0 w-[1px] bg-[#6E4204]/35" />
          {/* Subtle top metallic light reflection */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        </div>
      </div>
    </button>
  );
}
