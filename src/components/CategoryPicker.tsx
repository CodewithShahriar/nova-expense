import { useEffect, useRef, useState } from "react";
import { X, Search, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { allCategories, pickerIcons, pickerColors, iconRegistry } from "@/lib/categories";
import { store, useStore, type CustomCategory } from "@/lib/storage";

export function CategoryPicker({
  open,
  onClose,
  value,
  onChange,
  type,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (name: string) => void;
  type: "expense" | "income";
}) {
  const custom = useStore((s) => s.customCategories);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(pickerIcons[0]);
  const [newColor, setNewColor] = useState(pickerColors[0]);

  useEffect(() => {
    if (!open) { setQuery(""); setCreating(false); setNewName(""); }
  }, [open]);

  const list = allCategories(custom).filter((c) => c.type === type || c.type === "both");
  const filtered = list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  function saveCustom() {
    const name = newName.trim();
    if (!name) return;
    const c: CustomCategory = { name, icon: newIcon, color: newColor, type };
    store.addCustomCategory(c);
    onChange(name);
    setCreating(false);
    setNewName("");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-strong rounded-t-[2rem] sm:rounded-[2rem] border-t border-border p-5 pb-8 animate-slide-up max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">{creating ? "New category" : "Choose category"}</h2>
          <button onClick={onClose} className="size-9 rounded-full glass flex items-center justify-center"><X className="size-4" /></button>
        </div>

        {!creating ? (
          <>
            <div className="glass rounded-2xl h-11 px-3 flex items-center gap-2 mb-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                className="bg-transparent outline-none flex-1 text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {filtered.map((c) => {
                const Icon = c.icon;
                const active = value === c.name;
                return (
                  <button
                    key={c.name}
                    onClick={() => { onChange(c.name); onClose(); }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl p-3 transition",
                      active ? "glass-strong ring-2 ring-primary/70" : "glass"
                    )}
                  >
                    <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${c.color} 22%, transparent)` }}>
                      <Icon className="size-5" style={{ color: c.color }} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight">{c.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setCreating(true)}
                className="flex flex-col items-center gap-2 rounded-2xl p-3 glass border-dashed border border-primary/40"
              >
                <div className="size-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Plus className="size-5 text-primary-foreground" />
                </div>
                <span className="text-[11px] font-medium">Add new</span>
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              autoFocus
              className="glass rounded-2xl h-12 px-4 w-full text-sm outline-none"
              maxLength={24}
            />

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Icon</p>
              <div className="grid grid-cols-7 gap-2">
                {pickerIcons.map((n) => {
                  const Icon = iconRegistry[n];
                  const a = newIcon === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setNewIcon(n)}
                      className={cn("size-11 rounded-xl flex items-center justify-center", a ? "gradient-primary text-primary-foreground" : "glass")}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {pickerColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn("size-8 rounded-full border-2", newColor === c ? "border-primary scale-110" : "border-transparent")}
                    style={{ background: c }}
                    aria-label="Color"
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setCreating(false)} className="flex-1 h-12 rounded-2xl glass font-medium text-sm">Cancel</button>
              <button onClick={saveCustom} disabled={!newName.trim()} className="flex-1 h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                <Check className="size-4" /> Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
