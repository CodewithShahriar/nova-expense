import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function DatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = new Date(value);
  const [view, setView] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));

  const start = new Date(view.getFullYear(), view.getMonth(), 1);
  const end = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const leading = start.getDay();
  const days = Array.from({ length: leading + end.getDate() }, (_, i) => {
    if (i < leading) return null;
    return new Date(view.getFullYear(), view.getMonth(), i - leading + 1);
  });

  function select(d: Date) {
    onChange(d.toISOString());
    setOpen(false);
  }

  const sel = new Date(value);
  const today = new Date();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass w-full rounded-2xl px-4 h-12 flex items-center gap-3 text-sm"
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        <span className="flex-1 text-left">{fmt(date)}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 mx-auto max-w-sm glass-strong rounded-2xl p-4 shadow-elegant animate-scale-in sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+8px)] sm:bottom-auto sm:max-w-none">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="size-9 rounded-full glass flex items-center justify-center">
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-semibold">
                {view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="size-9 rounded-full glass flex items-center justify-center">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-[10px] uppercase tracking-widest text-muted-foreground py-1">{d}</div>
              ))}
              {days.map((d, i) => {
                if (!d) return <div key={i} />;
                const isSel = d.toDateString() === sel.toDateString();
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => select(d)}
                    className={cn(
                      "aspect-square m-0.5 min-h-9 rounded-full text-sm font-medium transition",
                      isSel ? "gradient-primary text-primary-foreground" : isToday ? "text-primary" : "hover:bg-muted/60"
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
