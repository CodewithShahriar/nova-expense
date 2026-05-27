import { type Account } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CreditCard, Wallet, Banknote, Landmark } from "lucide-react";

const iconFor = (t: Account["type"]) =>
  t === "card" ? CreditCard : t === "cash" ? Banknote : t === "wallet" ? Wallet : Landmark;

export function AccountSelect({
  accounts,
  value,
  onChange,
  exclude,
}: {
  accounts: Account[];
  value?: string;
  onChange: (id: string) => void;
  exclude?: string;
}) {
  const filtered = accounts.filter((a) => a.id !== exclude);
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1 min-[380px]:-mx-5 min-[380px]:px-5">
      {filtered.map((a) => {
        const Icon = iconFor(a.type);
        const active = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cn(
              "relative shrink-0 rounded-2xl p-3 pr-4 flex items-center gap-3 transition min-w-[142px] max-w-[78vw] outline-none",
              active
                ? "glass-strong border-primary/55 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_72%,transparent),0_10px_30px_-18px_var(--primary)]"
                : "glass hover:border-primary/20",
            )}
          >
            {active && (
              <span
                className="pointer-events-none absolute inset-[1px] rounded-[calc(1rem-1px)]"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.17 162 / 12%), transparent 55%)",
                }}
              />
            )}
            <div
              className="relative z-10 size-9 rounded-xl flex items-center justify-center text-white shadow-card"
              style={{ background: a.gradient }}
            >
              <Icon className="size-4" />
            </div>
            <div className="relative z-10 text-left min-w-0">
              <p className="text-xs font-semibold truncate">{a.name}</p>
              <p
                className={cn(
                  "text-[10px] capitalize",
                  active ? "text-primary/80" : "text-muted-foreground",
                )}
              >
                {a.type}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
