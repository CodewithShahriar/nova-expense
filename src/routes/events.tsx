import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode, type WheelEvent } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Cake,
  Camera,
  Clapperboard,
  Gem,
  Check,
  Gift,
  GraduationCap,
  Heart,
  Hotel,
  Landmark,
  Map as MapIcon,
  Music,
  PartyPopper,
  Pencil,
  Plus,
  Plane,
  Ship,
  Sparkles,
  Tent,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { allCategories, getCategory, pickerColors } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { formatMoney, store, useStore, type EventExpense, type ExpenseEvent } from "@/lib/storage";

export const Route = createFileRoute("/events")({
  component: EventsPage,
});

const eventIcons: Record<string, LucideIcon> = {
  PartyPopper,
  Map: MapIcon,
  Cake,
  Gift,
  Briefcase,
  Landmark,
  CalendarDays,
  Plane,
  Ship,
  Hotel,
  Tent,
  Camera,
  Music,
  Clapperboard,
  GraduationCap,
  Building2,
  Heart,
  Gem,
  Sparkles,
};

const eventTemplates = [
  { title: "Tour", icon: "Map", color: "oklch(0.75 0.17 210)" },
  { title: "Picnic", icon: "PartyPopper", color: "oklch(0.78 0.17 162)" },
  { title: "Birthday", icon: "Cake", color: "oklch(0.72 0.19 330)" },
  { title: "Wedding", icon: "Gift", color: "oklch(0.75 0.17 40)" },
  { title: "Office Trip", icon: "Briefcase", color: "oklch(0.72 0.18 250)" },
];

function EventsPage() {
  const events = useStore((s) => s.events);
  const currency = useStore((s) => s.settings.currency);
  const custom = useStore((s) => s.customCategories);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id || null);
  const selected = events.find((event) => event.id === selectedId) || events[0];

  const totals = useMemo(() => {
    const cost = events.reduce(
      (sum, event) =>
        sum +
        event.expenses.reduce(
          (inner, entry) => inner + (entry.type === "income" ? 0 : entry.amount),
          0,
        ),
      0,
    );
    const income = events.reduce(
      (sum, event) =>
        sum +
        event.expenses.reduce(
          (inner, entry) => inner + (entry.type === "income" ? entry.amount : 0),
          0,
        ),
      0,
    );
    const active = events.filter((event) => event.expenses.length > 0).length;
    return { cost, income, active };
  }, [events]);

  return (
    <div className="px-4 min-[380px]:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Separate costs for trips and plans</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow active:scale-95"
          aria-label="Add event"
        >
          {adding ? (
            <X className="size-5 text-primary-foreground" />
          ) : (
            <Plus className="size-5 text-primary-foreground" />
          )}
        </button>
      </div>

      <GlassCard className="mt-5 overflow-hidden p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15">
            <PartyPopper className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Event ledger</p>
            <p className="mt-1 truncate font-semibold">
              {events.length} events, {totals.active} with expenses
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-lg font-bold tabular">
              {formatMoney(totals.income - totals.cost, currency, true)}
            </p>
            <p className="text-[11px] text-muted-foreground">net</p>
          </div>
        </div>
      </GlassCard>

      {adding && (
        <EventForm
          mode="create"
          onClose={() => setAdding(false)}
          onSaved={(id) => {
            setSelectedId(id ?? null);
            setAdding(false);
          }}
        />
      )}

      {events.length === 0 ? (
        <EmptyEvents onTemplate={(template) => setAddingFromTemplate(template)} />
      ) : (
        <>
          <HorizontalScroll className="mt-5 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {events.map((event) => (
              <EventChip
                key={event.id}
                event={event}
                currency={currency}
                selected={event.id === selected?.id}
                onClick={() => setSelectedId(event.id)}
              />
            ))}
          </HorizontalScroll>

          {selected && (
            <EventDetail
              event={selected}
              currency={currency}
              categories={allCategories(custom).filter((category) => category.type !== "income")}
            />
          )}
        </>
      )}
    </div>
  );

  function setAddingFromTemplate(template: (typeof eventTemplates)[number]) {
    const id = store.addEvent({
      title: template.title,
      date: new Date().toISOString(),
      color: template.color,
      icon: template.icon,
    });
    setSelectedId(id);
    toast.success(`${template.title} event created`);
  }
}

function EventChip({
  event,
  currency,
  selected,
  onClick,
}: {
  event: ExpenseEvent;
  currency: string;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = eventIcons[event.icon] || CalendarDays;
  const totals = eventTotals(event);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[6.5rem] w-[9.25rem] shrink-0 rounded-2xl p-3 text-left transition active:scale-[0.98]",
        selected ? "glass-strong ring-1 ring-primary/45" : "glass",
      )}
    >
      <div
        className="flex size-10 items-center justify-center rounded-2xl"
        style={{ background: `color-mix(in oklch, ${event.color} 18%, transparent)` }}
      >
        <Icon className="size-5" style={{ color: event.color }} />
      </div>
      <p className="mt-3 truncate text-sm font-semibold">{event.title}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground tabular">
        Net {formatMoney(totals.net, currency, true)}
      </p>
    </button>
  );
}

function EventDetail({
  event,
  currency,
  categories,
}: {
  event: ExpenseEvent;
  currency: string;
  categories: ReturnType<typeof allCategories>;
}) {
  const [editingEvent, setEditingEvent] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<EventExpense | null>(null);
  const Icon = eventIcons[event.icon] || CalendarDays;
  const totals = eventTotals(event);
  const remaining = typeof event.budget === "number" ? event.budget - totals.cost : null;

  if (editingEvent) {
    return (
      <EventForm
        mode="edit"
        event={event}
        onClose={() => setEditingEvent(false)}
        onSaved={() => setEditingEvent(false)}
      />
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <GlassCard className="overflow-hidden p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in oklch, ${event.color} 20%, transparent)` }}
          >
            <Icon className="size-6" style={{ color: event.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold">{event.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(true)}
                  className="flex size-9 items-center justify-center rounded-xl glass"
                  aria-label="Edit event"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Delete ${event.title}?`)) return;
                    store.deleteEvent(event.id);
                    toast.success("Event removed");
                  }}
                  className="flex size-9 items-center justify-center rounded-xl glass text-muted-foreground hover:text-destructive"
                  aria-label="Delete event"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            {event.description && (
              <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Metric label="Income" value={formatMoney(totals.income, currency, true)} tone="income" />
          <Metric label="Cost" value={formatMoney(totals.cost, currency, true)} tone="danger" />
          <Metric
            label={remaining === null ? "Budget" : "Remaining"}
            value={remaining === null ? "Not set" : formatMoney(remaining, currency, true)}
            tone={remaining !== null && remaining < 0 ? "danger" : "default"}
          />
          <Metric
            label="Net balance"
            value={formatMoney(totals.net, currency, true)}
            tone={totals.net < 0 ? "danger" : "income"}
          />
        </div>

        {typeof event.budget === "number" && (
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (totals.cost / event.budget) * 100)}%`,
                background: totals.cost > event.budget ? "var(--gradient-danger)" : event.color,
              }}
            />
          </div>
        )}
      </GlassCard>

      {addingExpense || editingExpense ? (
        <ExpenseForm
          event={event}
          categories={categories.map((category) => category.name)}
          expense={editingExpense || undefined}
          onClose={() => {
            setAddingExpense(false);
            setEditingExpense(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingExpense(true)}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="size-4" />
          Add event income / cost
        </button>
      )}

      <div className="space-y-2">
        {event.expenses.length === 0 ? (
          <GlassCard className="py-9 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
              <PartyPopper className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-semibold">No income or costs in this event</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Entries you add here stay out of accounts and activity.
            </p>
          </GlassCard>
        ) : (
          event.expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              currency={currency}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => {
                store.deleteEventExpense(event.id, expense.id);
                toast.success("Event entry deleted");
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EventForm({
  mode,
  event,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  event?: ExpenseEvent;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [date, setDate] = useState(() => (event ? isoDay(event.date) : isoDay(new Date())));
  const [budget, setBudget] = useState(event?.budget ? String(event.budget) : "");
  const [color, setColor] = useState(event?.color || eventTemplates[0].color);
  const [icon, setIcon] = useState(event?.icon || eventTemplates[0].icon);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsedBudget = budget.trim() ? parseFloat(budget) : undefined;

    if (!title.trim()) {
      toast.error("Event title required", { description: "Use a name like Tour or Office Trip." });
      return;
    }
    if (parsedBudget !== undefined && (!Number.isFinite(parsedBudget) || parsedBudget <= 0)) {
      toast.error("Budget must be positive");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      date: new Date(date).toISOString(),
      budget: parsedBudget,
      color,
      icon,
    };

    if (mode === "edit" && event) {
      store.updateEvent(event.id, payload);
      toast.success("Event updated");
      onSaved(event.id);
      return;
    }

    const id = store.addEvent(payload);
    toast.success("Event created");
    onSaved(id);
  }

  return (
    <GlassCard className="mt-4 p-4 animate-slide-up">
      <form onSubmit={save} className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{mode === "edit" ? "Edit event" : "New event"}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full glass"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="glass min-h-20 w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="glass h-12 min-w-0 rounded-2xl px-3 text-sm outline-none"
          />
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="Budget optional"
            className="glass h-12 min-w-0 rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <HorizontalScroll className="flex gap-2 overflow-x-auto no-scrollbar">
          {Object.entries(eventIcons).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              onClick={() => setIcon(name)}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                icon === name ? "gradient-primary text-primary-foreground" : "glass",
              )}
              aria-label={name}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </HorizontalScroll>

        <HorizontalScroll className="flex gap-2 overflow-x-auto no-scrollbar">
          {[...pickerColors, "oklch(0.75 0.19 350)"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setColor(item)}
              className={cn(
                "size-9 shrink-0 rounded-full border-2",
                color === item ? "border-primary" : "border-transparent",
              )}
              style={{ background: item }}
              aria-label="Event color"
            />
          ))}
        </HorizontalScroll>

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
        >
          {mode === "edit" ? <Check className="size-4" /> : <Plus className="size-4" />}
          {mode === "edit" ? "Save event" : "Create event"}
        </button>
      </form>
    </GlassCard>
  );
}

function ExpenseForm({
  event,
  categories,
  expense,
  onClose,
}: {
  event: ExpenseEvent;
  categories: string[];
  expense?: EventExpense;
  onClose: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">(expense?.type || "expense");
  const [title, setTitle] = useState(expense?.title || "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category || categories[0] || "Other");
  const [date, setDate] = useState(() => (expense ? isoDay(expense.date) : isoDay(new Date())));
  const [note, setNote] = useState(expense?.note || "");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);

    if (!title.trim()) {
      toast.error("Expense title required");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Amount required");
      return;
    }

    const payload = {
      title: title.trim(),
      type,
      amount: value,
      category,
      date: new Date(date).toISOString(),
      note: note.trim() || undefined,
    };

    if (expense) {
      store.updateEventExpense(event.id, expense.id, payload);
      toast.success("Event entry updated");
    } else {
      store.addEventExpense(event.id, payload);
      toast.success(type === "income" ? "Event income added" : "Event cost added", {
        description: "It was saved only inside this event.",
      });
    }
    onClose();
  }

  return (
    <GlassCard className="p-4 animate-slide-up">
      <form onSubmit={save} className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{expense ? "Edit event entry" : "New event entry"}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full glass"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition",
              type === "expense" ? "bg-destructive/20 text-destructive" : "text-muted-foreground",
            )}
          >
            <TrendingDown className="size-4" />
            Cost
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition",
              type === "income" ? "bg-primary/20 text-primary" : "text-muted-foreground",
            )}
          >
            <TrendingUp className="size-4" />
            Income
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "income" ? "Income title" : "Cost title"}
          className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder={type === "income" ? "Income amount" : "Cost amount"}
            className="glass h-12 min-w-0 rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="glass h-12 min-w-0 rounded-2xl px-3 text-sm outline-none"
          />
        </div>

        <HorizontalScroll className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories
            .filter((item) => item !== "Transfer")
            .slice(0, 12)
            .map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3 text-xs font-semibold",
                  category === item
                    ? "gradient-primary text-primary-foreground"
                    : "glass text-muted-foreground",
                )}
              >
                {item}
              </button>
            ))}
        </HorizontalScroll>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note"
          className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
        />

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
        >
          {expense ? <Check className="size-4" /> : <Plus className="size-4" />}
          {expense ? "Save entry" : type === "income" ? "Add income" : "Add cost"}
        </button>
      </form>
    </GlassCard>
  );
}

function ExpenseRow({
  expense,
  currency,
  onEdit,
  onDelete,
}: {
  expense: EventExpense;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = getCategory(expense.category);
  const Icon = cat.icon;
  const isIncome = expense.type === "income";

  return (
    <GlassCard className="flex items-center gap-3 p-3">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `color-mix(in oklch, ${cat.color} 18%, transparent)` }}
      >
        <Icon className="size-5" style={{ color: cat.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{expense.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {isIncome ? "Income" : "Cost"} - {expense.category} -{" "}
          {new Date(expense.date).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
          {expense.note ? ` - ${expense.note}` : ""}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 font-display text-sm font-semibold tabular",
          isIncome ? "text-primary" : "text-destructive",
        )}
      >
        {isIncome ? "+" : "-"}
        {formatMoney(expense.amount, currency, true)}
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl glass"
        aria-label="Edit expense"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl glass text-muted-foreground hover:text-destructive"
        aria-label="Delete expense"
      >
        <Trash2 className="size-4" />
      </button>
    </GlassCard>
  );
}

function EmptyEvents({
  onTemplate,
}: {
  onTemplate: (template: (typeof eventTemplates)[number]) => void;
}) {
  return (
    <GlassCard className="mt-5 p-5 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15">
        <CalendarDays className="size-6 text-primary" />
      </div>
      <p className="mt-4 text-sm font-semibold">No event expenses yet</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        Create a separate event ledger for tours, picnics, birthdays, weddings, or office trips.
      </p>
      <HorizontalScroll className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {eventTemplates.map((template) => (
          <button
            key={template.title}
            type="button"
            onClick={() => onTemplate(template)}
            className="h-10 shrink-0 rounded-full glass px-3 text-xs font-semibold"
          >
            {template.title}
          </button>
        ))}
      </HorizontalScroll>
    </GlassCard>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "income";
}) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-display text-lg font-bold tabular",
          tone === "danger" && "text-destructive",
          tone === "income" && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function eventTotals(event: ExpenseEvent) {
  const income = event.expenses.reduce(
    (sum, entry) => sum + (entry.type === "income" ? entry.amount : 0),
    0,
  );
  const cost = event.expenses.reduce(
    (sum, entry) => sum + (entry.type === "income" ? 0 : entry.amount),
    0,
  );

  return { income, cost, net: income - cost };
}

function HorizontalScroll({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={className} onWheel={scrollHorizontally}>
      {children}
    </div>
  );
}

function scrollHorizontally(event: WheelEvent<HTMLDivElement>) {
  const target = event.currentTarget;
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (!delta || target.scrollWidth <= target.clientWidth) return;

  const canScrollLeft = delta < 0 && target.scrollLeft > 0;
  const canScrollRight = delta > 0 && target.scrollLeft < target.scrollWidth - target.clientWidth;

  if (canScrollLeft || canScrollRight) {
    target.scrollLeft += delta;
  }
}

function isoDay(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}
