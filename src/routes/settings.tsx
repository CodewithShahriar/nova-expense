import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import {
  ArrowLeft,
  Bell,
  Database,
  Download,
  Moon,
  Palette,
  Sun,
  Trash2,
  User,
  Upload,
  X,
} from "lucide-react";
import { AuthSyncCard } from "@/components/AuthSyncCard";
import { GlassCard } from "@/components/GlassCard";
import { store, useStore } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const bills = useStore((s) => s.bills);
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (confirm("Delete all transactions? This cannot be undone.")) {
      transactions.forEach((t) => store.deleteTransaction(t.id));
    }
  }

  function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
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

  const initials = (settings.name || "You")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+9.5rem)] animate-fade-in">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full glass active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Profile, sync, and app controls</p>
        </div>
      </div>

      <GlassCard className="relative overflow-hidden rounded-[1.75rem] p-5 shadow-elegant">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25"
          style={{ background: "var(--gradient-primary)" }}
          aria-hidden
        />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Profile</p>
              <p className="mt-1 text-sm font-semibold">Personal workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {settings.avatar ? (
              <img
                src={settings.avatar}
                alt=""
                className="size-18 rounded-full object-cover ring-2 ring-primary/40"
              />
            ) : (
              <div className="flex size-18 items-center justify-center rounded-full gradient-primary ring-2 ring-primary/40">
                <span className="text-lg font-bold text-primary-foreground">
                  {initials || <User className="size-6" />}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={settings.name}
                onChange={(e) => store.updateSettings({ name: e.target.value })}
                className="w-full bg-transparent text-lg font-semibold outline-none"
                placeholder="Your name"
                maxLength={40}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {transactions.length} transactions · {bills.length} bill records
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat icon={Database} label="Transactions" value={String(transactions.length)} />
            <MiniStat icon={Bell} label="Bills" value={String(bills.length)} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground"
            >
              <Upload className="size-4" /> {settings.avatar ? "Change photo" : "Upload photo"}
            </button>
            <button
              onClick={() => store.updateSettings({ avatar: undefined })}
              disabled={!settings.avatar}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted/55 text-sm font-semibold disabled:opacity-40"
            >
              <X className="size-4" /> Remove
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onAvatarFile}
            className="hidden"
          />
        </div>
      </GlassCard>

      <SectionTitle title="Cloud Sync" description="Secure login and cross-device backup" />
      <AuthSyncCard />

      <SectionTitle title="Preferences" description="Tune how Nova looks and formats money" />
      <GlassCard className="mt-3 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
            <Palette className="size-4 text-primary" />
          </div>
          <p className="text-sm font-semibold">Appearance</p>
        </div>
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
                "flex h-14 items-center justify-center gap-2 rounded-2xl transition",
                settings.theme === id
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "glass text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="mt-3 p-4">
        <p className="mb-1 text-sm font-semibold">Currency</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Using Bangladeshi Taka (BDT) across the app
        </p>
        <div className="flex h-12 items-center justify-center gap-2 rounded-2xl gradient-primary font-semibold text-primary-foreground">
          <span>BDT</span>
        </div>
      </GlassCard>

      <SectionTitle title="Data" description="Export or clear transaction records" />
      <GlassCard className="mt-3 p-2">
        <button
          onClick={exportCSV}
          disabled={transactions.length === 0}
          className="flex w-full items-center gap-3 rounded-2xl p-3 transition hover:bg-muted/40 disabled:opacity-40"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <Download className="size-4" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium">Export as CSV</p>
            <p className="text-xs text-muted-foreground">Download all your transactions</p>
          </div>
        </button>
        <button
          onClick={clearAll}
          disabled={transactions.length === 0}
          className="flex w-full items-center gap-3 rounded-2xl p-3 transition hover:bg-destructive/10 disabled:opacity-40"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/15">
            <Trash2 className="size-4 text-destructive" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium text-destructive">Delete all transactions</p>
            <p className="text-xs text-muted-foreground">This cannot be undone</p>
          </div>
        </button>
      </GlassCard>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Nova Expense · v2.0 · Local-first with cloud sync
      </p>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-2 mt-6 px-1">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/45 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <p className="text-[10px] uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1 font-display text-lg font-bold tabular">{value}</p>
    </div>
  );
}
