import type { Bill } from "@/lib/storage";

export function billRuntimeStatus(bill: Bill): Bill["status"] {
  if (bill.status === "paid") return "paid";

  const today = startOfDay(new Date());
  const due = startOfDay(new Date(bill.dueDate));

  if (due < today) return "overdue";
  return "upcoming";
}

export function billTimingLabel(bill: Bill) {
  const status = billRuntimeStatus(bill);
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";

  const diff = daysUntil(bill.dueDate);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} days`;
}

export function daysUntil(date: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(date));
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function formatDueDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
