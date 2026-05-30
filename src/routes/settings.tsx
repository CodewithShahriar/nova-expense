import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Database,
  Download,
  Moon,
  Palette,
  Receipt,
  ShieldCheck,
  Sun,
  Tags,
  Trash2,
  User,
  Upload,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AuthSyncCard } from "@/components/AuthSyncCard";
import { GlassCard } from "@/components/GlassCard";
import { formatMoney, store, useStore } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const bills = useStore((s) => s.bills);
  const events = useStore((s) => s.events);
  const goals = useStore((s) => s.goals);
  const customCategories = useStore((s) => s.customCategories);
  const fileRef = useRef<HTMLInputElement>(null);

  const workspace = useMemo(
    () => ({
      balance: accounts.reduce((sum, account) => sum + account.balance, 0),
      records:
        transactions.length +
        accounts.length +
        bills.length +
        events.length +
        goals.length +
        customCategories.length,
    }),
    [
      accounts,
      bills.length,
      customCategories.length,
      events.length,
      goals.length,
      transactions.length,
    ],
  );

  const hasWorkspaceData = workspace.records > 0;
  const initials = (settings.name || "You")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function exportCSV() {
    const headers = ["date", "type", "amount", "category", "account", "note"];
    const rows = transactions.map((t) =>
      [
        new Date(t.date).toISOString(),
        t.type,
        t.amount,
        t.category,
        t.accountId || `${t.fromAccountId || ""}->${t.toAccountId || ""}`,
        (t.note || "").replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-expense-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    if (confirm("Delete all app data? Accounts, cards, transactions, bills, and goals will reset.")) {
      store.resetWorkspace();
    }
  }

  function onAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const ratio = Math.max(size / img.width, size / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        store.updateSettings({ avatar: canvas.toDataURL("image/jpeg", 0.85) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+9.5rem)] animate-fade-in">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full glass active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <div className="size-10" />
      </div>

      <GlassCard className="overflow-hidden p-0 shadow-elegant">
        <div className="gradient-primary px-5 py-5 text-primary-foreground">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
              aria-label={settings.avatar ? "Change profile photo" : "Upload profile photo"}
            >
              {settings.avatar ? (
                <img
                  src={settings.avatar}
                  alt=""
                  className="size-18 rounded-full border border-white/25 object-cover shadow-card"
                />
              ) : (
                <span className="flex size-18 items-center justify-center rounded-full border border-white/25 bg-white/20 shadow-card">
                  <span className="text-lg font-bold">{initials || <User className="size-6" />}</span>
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest opacity-75">Workspace</p>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => store.updateSettings({ name: e.target.value })}
                className="mt-1 w-full bg-transparent font-display text-2xl font-bold outline-none placeholder:text-primary-foreground/55"
                placeholder="Your name"
                maxLength={40}
              />
              <p className="mt-1 text-xs font-medium opacity-75">{workspace.records} saved records</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onAvatarFile}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 p-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-muted/45 text-xs font-semibold"
          >
            <Upload className="size-4" /> {settings.avatar ? "Change photo" : "Upload photo"}
          </button>
          <button
            onClick={() => store.updateSettings({ avatar: undefined })}
            disabled={!settings.avatar}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-muted/45 text-xs font-semibold disabled:opacity-40"
          >
            <X className="size-4" /> Remove
          </button>
        </div>
      </GlassCard>

      <SectionTitle title="Overview" />
      <div className="grid grid-cols-2 gap-2">
        <MiniStat icon={Wallet} label="Balance" value={formatMoney(workspace.balance, settings.currency)} />
        <MiniStat icon={Database} label="Transactions" value={String(transactions.length)} />
        <MiniStat icon={CreditCard} label="Accounts" value={String(accounts.length)} />
        <MiniStat icon={Receipt} label="Bills" value={String(bills.length)} />
        <MiniStat icon={CalendarDays} label="Events" value={String(events.length)} />
        <MiniStat icon={Tags} label="Categories" value={String(customCategories.length)} />
      </div>

      <SectionTitle title="Preferences" />
      <GlassCard className="p-2">
        <SettingsBlock icon={Palette} title="Appearance">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "dark", label: "Dark", Icon: Moon },
                { id: "light", label: "Light", Icon: Sun },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => store.updateSettings({ theme: id })}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-2xl transition",
                  settings.theme === id
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "bg-muted/45 text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </SettingsBlock>

        <SettingsBlock icon={Wallet} title="Currency">
          <div className="flex h-12 items-center justify-between rounded-2xl bg-muted/45 px-4">
            <span className="text-sm font-semibold">Bangladeshi Taka</span>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              BDT
            </span>
          </div>
        </SettingsBlock>
      </GlassCard>

      <SectionTitle title="Cloud Sync" />
      <AuthSyncCard />

      <SectionTitle title="Data" />
      <GlassCard className="p-2">
        <ActionRow
          icon={Download}
          title="Export as CSV"
          detail={`${transactions.length} transactions`}
          disabled={transactions.length === 0}
          onClick={exportCSV}
        />
        <ActionRow
          icon={Trash2}
          title="Reset all data"
          detail="Accounts, bills, goals, and transactions"
          danger
          disabled={!hasWorkspaceData}
          onClick={clearAll}
        />
      </GlassCard>

      <GlassCard className="mt-6 flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Nova Expense v2.0</p>
          <p className="text-xs text-muted-foreground">Local-first with cloud sync</p>
        </div>
      </GlassCard>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-2 mt-6 px-1">
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

function SettingsBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl p-2">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-4 text-primary" />
        </div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  detail,
  danger,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-muted/40 disabled:opacity-40",
        danger && "hover:bg-destructive/10",
      )}
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-xl bg-muted",
          danger && "bg-destructive/15",
        )}
      >
        <Icon className={cn("size-4", danger && "text-destructive")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", danger && "text-destructive")}>{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </button>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <p className="text-[10px] uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1 truncate font-display text-lg font-bold tabular">{value}</p>
    </GlassCard>
  );
}
