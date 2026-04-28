import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ArrowLeft, Download, Moon, Sun, Trash2, User, Upload, X } from "lucide-react";
import { store, useStore } from "@/lib/storage";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportCSV() {
    const headers = ["date", "type", "amount", "category", "account", "note"];
    const rows = transactions.map((t) => [
      new Date(t.date).toISOString(),
      t.type, t.amount, t.category,
      t.accountId || `${t.fromAccountId || ""}→${t.toAccountId || ""}`,
      (t.note || "").replace(/"/g, '""'),
    ].map((v) => `"${v}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pocketledger-${Date.now()}.csv`; a.click();
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
      // Resize to max 512 via canvas
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

  const initials = (settings.name || "You").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" aria-label="Back" className="size-10 rounded-full glass flex items-center justify-center active:scale-95">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
      </div>

      {/* Profile */}
      <GlassCard className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Profile</p>
        <div className="flex items-center gap-4">
          <div className="relative">
            {settings.avatar ? (
              <img src={settings.avatar} alt="" className="size-16 rounded-full object-cover ring-2 ring-primary/40" />
            ) : (
              <div className="size-16 rounded-full gradient-primary flex items-center justify-center ring-2 ring-primary/40">
                <span className="text-primary-foreground font-bold">{initials || <User className="size-6" />}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={settings.name}
              onChange={(e) => store.updateSettings({ name: e.target.value })}
              className="bg-transparent outline-none font-semibold w-full text-base"
              placeholder="Your name"
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground mt-0.5">{transactions.length} transactions saved</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="h-11 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Upload className="size-4" /> {settings.avatar ? "Change photo" : "Upload photo"}
          </button>
          <button
            onClick={() => store.updateSettings({ avatar: undefined })}
            disabled={!settings.avatar}
            className="h-11 rounded-2xl glass text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <X className="size-4" /> Remove
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarFile} className="hidden" />
      </GlassCard>

      {/* Theme */}
      <GlassCard className="mt-3 p-4">
        <p className="text-sm font-semibold mb-3">Appearance</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "dark", label: "Dark", Icon: Moon },
            { id: "light", label: "Light", Icon: Sun },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => store.updateSettings({ theme: id })}
              className={cn(
                "h-14 rounded-2xl flex items-center justify-center gap-2 transition",
                settings.theme === id ? "gradient-primary text-primary-foreground shadow-glow" : "glass text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Currency (locked to BDT) */}
      <GlassCard className="mt-3 p-4">
        <p className="text-sm font-semibold mb-1">Currency</p>
        <p className="text-xs text-muted-foreground mb-3">Using Bangladeshi Taka (৳) across the app</p>
        <div className="rounded-2xl gradient-primary text-primary-foreground h-12 flex items-center justify-center gap-2 font-semibold">
          <span>৳</span> BDT
        </div>
      </GlassCard>

      {/* Data */}
      <GlassCard className="mt-3 p-2">
        <button
          onClick={exportCSV}
          disabled={transactions.length === 0}
          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/40 transition disabled:opacity-40"
        >
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center"><Download className="size-4" /></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">Export as CSV</p>
            <p className="text-xs text-muted-foreground">Download all your transactions</p>
          </div>
        </button>
        <button
          onClick={clearAll}
          disabled={transactions.length === 0}
          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-destructive/10 transition disabled:opacity-40"
        >
          <div className="size-10 rounded-xl bg-destructive/15 flex items-center justify-center"><Trash2 className="size-4 text-destructive" /></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-destructive">Delete all transactions</p>
            <p className="text-xs text-muted-foreground">This cannot be undone</p>
          </div>
        </button>
      </GlassCard>

      <p className="text-center text-xs text-muted-foreground mt-8">PocketLedger · v2.0 · Data stored locally</p>
    </div>
  );
}
