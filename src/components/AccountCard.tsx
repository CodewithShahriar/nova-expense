import { formatMoney, type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";

const cardThemes = [
  {
    bg: "linear-gradient(135deg, #8b46f6 0%, #7a45f3 50%, #7f52ff 100%)",
    glow: "rgba(120, 54, 232, 0.55)",
    shape: "rgba(94, 43, 191, 0.26)",
  },
  {
    bg: "linear-gradient(135deg, #ff9957 0%, #ff8c4d 52%, #ff935b 100%)",
    glow: "rgba(255, 114, 51, 0.48)",
    shape: "rgba(218, 89, 42, 0.2)",
  },
  {
    bg: "linear-gradient(135deg, #6b738f 0%, #6d7692 50%, #727b98 100%)",
    glow: "rgba(83, 91, 120, 0.5)",
    shape: "rgba(39, 45, 72, 0.24)",
  },
  {
    bg: "linear-gradient(135deg, #bf2569 0%, #c12c74 52%, #b71f64 100%)",
    glow: "rgba(177, 31, 95, 0.48)",
    shape: "rgba(137, 20, 76, 0.22)",
  },
];

function themeFor(account: Account) {
  const seed = account.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

  return cardThemes[seed % cardThemes.length];
}

function formatCardNumber(value?: string) {
  if (!value) return "5282 3456 7890 1289";

  const normalized = value.replace(/[\u2022\u2014]/g, "").replace(/\s+/g, " ").trim();

  return normalized || value;
}

function MastercardMark() {
  return (
    <div className="flex flex-col items-end">
      <div className="relative h-7 w-11">
        <span className="absolute left-0 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#ff3b20]" />
        <span className="absolute right-1 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#ff9f00] mix-blend-screen" />
      </div>
      <span className="mt-0.5 text-[0.42rem] font-semibold lowercase tracking-tight text-white/65">
        mastercard
      </span>
    </div>
  );
}

function accountTypeLabel(type: Account["type"]) {
  if (type === "wallet") return "Mobile Wallet";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

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
  const theme = themeFor(account);
  const content = (
    <>
      <div
        className="pointer-events-none absolute -left-14 -top-20 h-[130%] w-[74%] rounded-full opacity-55"
        style={{ background: theme.shape }}
      />
      <div
        className="pointer-events-none absolute -right-11 -top-20 h-[116%] w-[64%] rounded-full opacity-60"
        style={{ background: theme.shape }}
      />
      <div
        className="pointer-events-none absolute inset-x-6 -bottom-16 h-28 rounded-full blur-3xl"
        style={{ background: theme.glow }}
      />

      <div
        className={cn(
          "relative flex h-full flex-col justify-between",
          compact ? "p-4" : "p-5",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className={cn("min-w-0", compact ? "pt-2" : "pt-4")}>
            <p className="truncate text-[0.68rem] font-bold leading-none text-white/75">
              {account.name}
            </p>
            <p className="mt-1 text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-white/45">
              {accountTypeLabel(account.type)}
            </p>
            <p className="mt-4 text-[0.56rem] font-semibold leading-none text-white/45">
              Current Balance
            </p>
            <p className="mt-1 font-display text-[1.45rem] font-bold leading-none tracking-normal tabular">
              {formatMoney(account.balance, currency)}
            </p>
          </div>

          <MastercardMark />
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <p className="min-w-0 truncate text-[0.58rem] font-medium tracking-wide text-white/45">
            {formatCardNumber(account.number)}
          </p>
          <div className="space-y-2 text-right font-display text-[0.62rem] font-bold leading-none text-white/65 tabular">
            <p>09/25</p>
            <p>09/25</p>
          </div>
        </div>
      </div>
    </>
  );

  const sharedClassName = cn(
    "group relative w-full overflow-hidden rounded-[1.6rem] text-left text-white shadow-elegant transition-transform active:scale-[0.985]",
    compact ? "aspect-[16/9]" : "aspect-[1.586/1]",
    className,
  );

  if (!onClick) {
    return (
      <div className={sharedClassName} style={{ background: theme.bg }}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={sharedClassName}
      style={{ background: theme.bg }}
    >
      {content}
    </button>
  );
}
