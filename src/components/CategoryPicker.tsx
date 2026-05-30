import { useEffect, useState, type DragEvent } from "react";
import { X, Search, Plus, Check, GripVertical } from "lucide-react";
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
  const categoryOrder = useStore((s) => categoryOrderForType(s.settings.categoryOrder, type));
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(pickerIcons[0]);
  const [newColor, setNewColor] = useState(pickerColors[0]);
  const [draggingName, setDraggingName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCreating(false);
      setNewName("");
    }
  }, [open]);

  const list = orderCategories(
    allCategories(custom).filter((c) => c.type === type || c.type === "both"),
    categoryOrder,
  );
  const filtered = list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const canReorder = !query.trim();

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

  function dragStart(event: DragEvent<HTMLButtonElement>, name: string) {
    if (!canReorder) return;
    setDraggingName(name);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", name);
  }

  function dropOn(name: string) {
    if (!draggingName || draggingName === name) {
      setDraggingName(null);
      return;
    }

    const from = list.findIndex((category) => category.name === draggingName);
    const to = list.findIndex((category) => category.name === name);
    if (from < 0 || to < 0) {
      setDraggingName(null);
      return;
    }

    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    store.reorderCategories(type, next.map((category) => category.name));
    setDraggingName(null);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative flex w-full max-w-lg flex-col glass-strong rounded-t-[2rem] sm:rounded-[2rem] border-t border-border p-4 min-[380px]:p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-slide-up max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="font-display text-lg min-[380px]:text-xl font-bold">
            {creating ? "New category" : "Choose category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-full glass flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {!creating ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="glass mb-3 min-[380px]:mb-4 shrink-0 rounded-2xl h-11 px-3 flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                className="min-w-0 bg-transparent outline-none flex-1 text-base placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-3 min-[380px]:grid-cols-4 content-start gap-2 min-[380px]:gap-3 overflow-y-auto no-scrollbar pr-0.5 pb-3">
              {filtered.map((c) => {
                const Icon = c.icon;
                const active = value === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    draggable={canReorder}
                    onDragStart={(event) => dragStart(event, c.name)}
                    onDragEnd={() => setDraggingName(null)}
                    onDragOver={(event) => {
                      if (!canReorder || !draggingName || draggingName === c.name) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      dropOn(c.name);
                    }}
                    onClick={() => {
                      onChange(c.name);
                      onClose();
                    }}
                    className={cn(
                      "relative flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl p-2 min-[380px]:p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      active
                        ? "glass-strong border-primary/55 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_72%,transparent),0_10px_30px_-18px_var(--primary)]"
                        : "glass",
                      draggingName === c.name && "opacity-50",
                    )}
                  >
                    {canReorder && (
                      <GripVertical className="absolute right-1.5 top-1.5 size-3.5 text-muted-foreground/55" />
                    )}
                    <div
                      className="size-9 min-[380px]:size-10 rounded-xl flex items-center justify-center"
                      style={{ background: `color-mix(in oklch, ${c.color} 22%, transparent)` }}
                    >
                      <Icon className="size-5" style={{ color: c.color }} />
                    </div>
                    <span className="max-w-full truncate text-[11px] font-medium text-center leading-tight">
                      {c.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl p-2 min-[380px]:p-3 glass border-dashed border border-primary/40"
              >
                <div className="size-9 min-[380px]:size-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Plus className="size-5 text-primary-foreground" />
                </div>
                <span className="text-[11px] font-medium">Add new</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto no-scrollbar pb-3">
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
              <div className="grid grid-cols-5 min-[380px]:grid-cols-7 gap-2">
                {pickerIcons.map((n) => {
                  const Icon = iconRegistry[n];
                  const a = newIcon === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNewIcon(n)}
                      className={cn(
                        "size-11 rounded-xl flex items-center justify-center",
                        a ? "gradient-primary text-primary-foreground" : "glass",
                      )}
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
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "size-8 rounded-full border-2",
                      newColor === c ? "border-primary scale-110" : "border-transparent",
                    )}
                    style={{ background: c }}
                    aria-label="Color"
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 h-12 rounded-2xl glass font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustom}
                disabled={!newName.trim()}
                className="flex-1 h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Check className="size-4" /> Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function orderCategories<T extends { name: string }>(categories: T[], order: string[]) {
  if (!order.length) return categories;

  const index = new Map(order.map((name, position) => [name, position]));
  return [...categories].sort((a, b) => {
    const aIndex = index.get(a.name);
    const bIndex = index.get(b.name);
    if (aIndex === undefined && bIndex === undefined) return 0;
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;
    return aIndex - bIndex;
  });
}

function categoryOrderForType(
  order: unknown,
  type: "expense" | "income",
): string[] {
  if (Array.isArray(order)) return order.filter((item): item is string => typeof item === "string");
  if (!order || typeof order !== "object") return [];

  const byType = (order as Partial<Record<"expense" | "income", unknown>>)[type];
  return Array.isArray(byType)
    ? byType.filter((item): item is string => typeof item === "string")
    : [];
}
