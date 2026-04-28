import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

function formatBdtBalance(balance: number) {
  return `\u09F3${Math.abs(balance).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function maskAccountNumber(number?: string) {
  const digits = number?.replace(/\D/g, "") ?? "";
  const lastFour = digits.slice(-4);

  return lastFour ? `**** ${lastFour}` : "**** 1234";
}

type FintechImageCardProps = {
  name: string;
  balance: number;
  number?: string;
  backgroundSrc?: string;
  label?: string;
  issuer?: ReactNode;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
};

export function FintechImageCard({
  name,
  balance,
  number,
  backgroundSrc,
  label = "Current Balance",
  issuer,
  className,
  compact = false,
  onClick,
}: FintechImageCardProps) {
  const style = {
    "--card-image": backgroundSrc ? `url("${backgroundSrc}")` : undefined,
  } as CSSProperties;

  const content = (
    <>
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center",
          backgroundSrc
            ? "bg-[image:var(--card-image)]"
            : "bg-[linear-gradient(135deg,#073b78_0%,#02528c_44%,#f7cd18_45%,#f4b41c_62%,#00477a_63%,#07315d_100%)]",
        )}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.34))]" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/12" />

      <div
        className={cn(
          "relative flex h-full flex-col justify-between text-white",
          compact ? "p-4" : "p-5 sm:p-6",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold leading-none drop-shadow-sm sm:text-2xl">
              {name}
            </p>
            <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/75">
              {label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold leading-none tabular drop-shadow-sm sm:text-3xl">
              {formatBdtBalance(balance)}
            </p>
          </div>

          {issuer && <div className="shrink-0">{issuer}</div>}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/65">
              Account Number
            </p>
            <p className="mt-1 font-display text-xl font-bold tracking-[0.16em] tabular drop-shadow-sm sm:text-2xl">
              {maskAccountNumber(number)}
            </p>
          </div>
          <p className="font-display text-2xl font-black italic tracking-tight text-white drop-shadow-sm sm:text-3xl">
            VISA
          </p>
        </div>
      </div>
    </>
  );

  const sharedClassName = cn(
    "relative w-full overflow-hidden rounded-[1.35rem] text-left shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition-transform active:scale-[0.985]",
    compact ? "aspect-[16/9]" : "aspect-[1.586/1]",
    className,
  );

  if (!onClick) {
    return (
      <div className={sharedClassName} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={sharedClassName} style={style}>
      {content}
    </button>
  );
}
