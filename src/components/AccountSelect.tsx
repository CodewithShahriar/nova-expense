import { type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CreditCard, Wallet, Banknote, Landmark } from "lucide-react";

const iconFor = (t: Account["type"]) => t === "card" ? CreditCard : t === "cash" ? Banknote : t === "wallet" ? Wallet : Landmark;

export function AccountSelect({ accounts, value, onChange, exclude }: {
  accounts: Account[];
  value?: string;
  onChange: (id: string) => void;
  exclude?: string;
}) {
  const filtered = accounts.filter((a) => a.id !== exclude);
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
      {filtered.map((a) => {
        const Icon = iconFor(a.type);
        const active = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cn(
              "shrink-0 rounded-2xl p-3 pr-4 flex items-center gap-3 transition min-w-[148px]",
              active ? "glass-strong ring-1 ring-primary/70" : "glass"
            )}
          >
            <div className="size-9 rounded-xl flex items-center justify-center text-white" style={{ background: a.gradient }}>
              <Icon className="size-4" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-semibold truncate">{a.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{a.type}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
