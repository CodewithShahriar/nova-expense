import { type Account } from "@/lib/storage";
import { FintechImageCard } from "@/components/FintechImageCard";

function accountTypeLabel(type: Account["type"]) {
  if (type === "wallet") return "Mobile Wallet";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function AccountCard({
  account,
  className,
  compact = false,
  onClick,
  backgroundSrc,
}: {
  account: Account;
  currency: string;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
  backgroundSrc?: string;
}) {
  return (
    <FintechImageCard
      name={account.name}
      balance={account.balance}
      number={account.number}
      backgroundSrc={backgroundSrc}
      compact={compact}
      className={className}
      onClick={onClick}
      issuer={
        <div className="rounded-full bg-black/20 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
          {accountTypeLabel(account.type)}
        </div>
      }
    />
  );
}
