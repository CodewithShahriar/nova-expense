import { useState } from "react";
import { type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/storage";
import { Eye, EyeOff } from "lucide-react";
import { VisaLogo } from "@/components/VisaLogo";

export function StackedCardDeck({
  accounts,
  currency,
  onCardClick,
}: {
  accounts: Account[];
  currency: string;
  onCardClick?: (account: Account) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNumber, setShowNumber] = useState(false);

  // Normalize list with demo accounts fallback
  const rawList = accounts.length > 0 ? accounts : fallbackAccounts;

  // Ensure card 0 has the iconic Neon Lime design and card 1 is Warm Sand/Peach
  const list = rawList.map((acc, idx) => {
    if (idx === 0) {
      return {
        ...acc,
        brand: "VISA",
        number: acc.number?.includes("5466") ? acc.number : "•••• •••• •••• 5466",
        gradient: "#C6F432",
      };
    }
    if (idx === 1 && !acc.gradient?.includes("#")) {
      return {
        ...acc,
        brand: "Mastercard",
        number: "•••• •••• •••• 2585",
        gradient: "linear-gradient(135deg, #FED7AA 0%, #FDBA74 40%, #F59E0B 100%)",
      };
    }
    return acc;
  });

  return (
    <div className="relative w-full pt-8 pb-3 px-4 min-[380px]:px-5 select-none">
      <div className="relative w-full aspect-[1.586/1] max-w-md mx-auto">
        {list.map((acc, index) => {
          const isFront = index === activeIndex;
          const offset = (index - activeIndex + list.length) % list.length;

          // Only render up to 3 cards in the visible stack
          if (offset > 2) return null;

          const isNeon =
            index === 0 ||
            acc.id === "acc-visa" ||
            acc.gradient?.includes("#C6F432") ||
            acc.gradient?.includes("#D4FF00");

          const isWarm =
            index === 1 ||
            acc.id === "acc-mastercard" ||
            acc.gradient?.includes("#FED7AA") ||
            acc.gradient?.includes("#FDBA74") ||
            acc.gradient?.includes("#F59E0B");

          const displayGradient = isNeon
            ? "#C6F432"
            : isWarm
              ? "linear-gradient(135deg, #FED7AA 0%, #FDBA74 40%, #F59E0B 100%)"
              : acc.gradient || "linear-gradient(135deg, #2D3444 0%, #171A24 100%)";

          const isLightText = !isNeon && !isWarm;
          const rawNumber = acc.number || (isNeon ? "•••• •••• •••• 5466" : "•••• •••• •••• 2585");
          const lastFour = rawNumber.replace(/\D/g, "").slice(-4) || (isNeon ? "5466" : "2585");
          const maskedNumber = showNumber ? rawNumber : `•••• •••• •••• ${lastFour}`;

          // Offset 0 = Front card
          // Offset 1 = Peeking directly behind (offset -28px, scale 0.95, z-10)
          // Offset 2 = Peeking further behind (offset -52px, scale 0.90, z-0)
          const translateY = offset === 0 ? 0 : offset === 1 ? -28 : -52;
          const scale = offset === 0 ? 1 : offset === 1 ? 0.95 : 0.9;
          const zIndex = 30 - offset * 10;
          const opacity = offset === 0 ? 1 : offset === 1 ? 0.98 : 0.88;

          return (
            <div
              key={acc.id}
              onClick={() => {
                if (!isFront) {
                  setActiveIndex(index);
                } else if (onCardClick) {
                  onCardClick(acc);
                }
              }}
              style={{
                background: displayGradient,
                transform: `translateY(${translateY}px) scale(${scale})`,
                zIndex,
                opacity,
              }}
              className={cn(
                "absolute inset-0 rounded-[1.8rem] min-[380px]:rounded-[2.2rem] overflow-hidden shadow-elegant cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-black/10",
                !isFront && "hover:brightness-105",
                isLightText ? "text-white" : "text-black font-sans",
              )}
            >
              {/* Subtle organic watermark rings on bottom-left for Neon card */}
              {isNeon && (
                <>
                  <div className="absolute -left-12 -bottom-10 size-44 rounded-full border-[1.5px] border-black/10 pointer-events-none" />
                  <div className="absolute left-6 -bottom-6 size-36 rounded-full border-[1.5px] border-black/10 pointer-events-none" />
                </>
              )}

              {/* CARD CONTENT */}
              <div className="relative h-full p-5 min-[380px]:p-6 pr-22 min-[380px]:pr-24 flex flex-col justify-between">
                {/* Top-Left: VISA logo and card number with eye toggle */}
                <div className="min-w-0">
                  {/* Brand Wordmark SVG */}
                  <div className="flex items-center">
                    {acc.brand === "Mastercard" ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2">
                          <span className="size-6 rounded-full bg-[#EB001B] inline-block opacity-90" />
                          <span className="size-6 rounded-full bg-[#F79E1B] inline-block opacity-90" />
                        </div>
                        <span
                          className={cn(
                            "font-display text-sm font-bold tracking-tight",
                            isLightText ? "text-white" : "text-black",
                          )}
                        >
                          mastercard
                        </span>
                      </div>
                    ) : (
                      <VisaLogo className="h-6 min-[380px]:h-7" light={isLightText} />
                    )}
                  </div>

                  {/* Masked card number directly below Brand */}
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={cn(
                        "font-display text-xs min-[380px]:text-sm tracking-[0.16em] tabular font-bold",
                        isLightText ? "text-white/90" : "text-black",
                      )}
                    >
                      {maskedNumber}
                    </span>
                    {isFront && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNumber(!showNumber);
                        }}
                        className={cn(
                          "p-0.5 rounded-full transition hover:scale-110 active:scale-95 cursor-pointer",
                          isLightText
                            ? "text-white/80 hover:bg-white/10"
                            : "text-black hover:bg-black/10",
                        )}
                        title={showNumber ? "Hide number" : "Show number"}
                      >
                        {showNumber ? (
                          <Eye className="size-4 stroke-[2.2]" />
                        ) : (
                          <EyeOff className="size-4 stroke-[2.2]" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom-Left: Balance label & Amount */}
                <div className="min-w-0 mt-auto">
                  <p
                    className={cn(
                      "text-xs min-[380px]:text-[13px] font-semibold tracking-tight",
                      isLightText ? "text-white/70" : "text-black",
                    )}
                  >
                    Balance
                  </p>
                  <p
                    className={cn(
                      "truncate font-display text-2xl min-[380px]:text-[1.85rem] font-extrabold tracking-tight tabular mt-0.5 leading-none",
                      isLightText ? "text-white" : "text-black",
                    )}
                  >
                    {formatMoney(acc.balance, currency)}
                  </p>
                </div>
              </div>

              {/* Right Vertical Capsule Container (Signature element from reference image) */}
              <div
                className={cn(
                  "absolute right-3.5 top-3.5 bottom-3.5 w-16 min-[380px]:w-18 rounded-[1.4rem] min-[380px]:rounded-[1.6rem] flex flex-col items-center justify-between py-4 min-[380px]:py-5 px-1 border",
                  isNeon
                    ? "bg-[#A8DB15] border-black/10 shadow-sm"
                    : isWarm
                      ? "bg-black/10 border-black/10 shadow-sm"
                      : "bg-white/10 border-white/10 shadow-sm",
                )}
              >
                {/* Contactless waves radiating outward: ) ) ) */}
                <div className="flex items-center justify-center pt-1">
                  <svg
                    className={cn(
                      "size-6 min-[380px]:size-7 stroke-[2.4]",
                      isLightText ? "text-white" : "text-black",
                    )}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

const fallbackAccounts: Account[] = [
  {
    id: "acc-visa",
    order: 0,
    name: "Sajibur's Visa",
    type: "card",
    brand: "VISA",
    number: "•••• •••• •••• 5466",
    balance: 786898.67,
    gradient: "#C6F432",
  },
  {
    id: "acc-mastercard",
    order: 1,
    name: "Mastercard Gold",
    type: "card",
    brand: "Mastercard",
    number: "•••• •••• •••• 2585",
    balance: 67545.23,
    gradient: "linear-gradient(135deg, #FED7AA 0%, #FDBA74 40%, #F59E0B 100%)",
  },
  {
    id: "acc-titanium",
    order: 2,
    name: "Titanium Slate",
    type: "card",
    brand: "VISA",
    number: "•••• •••• •••• 7845",
    balance: 8182.80,
    gradient: "linear-gradient(135deg, #2D3444 0%, #171A24 100%)",
  },
];
