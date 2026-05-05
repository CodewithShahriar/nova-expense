import type { Bill } from "@/lib/storage";

export function billRuntimeStatus(bill: Bill): Bill["status"] {
  if (bill.status === "paid" && bill.repeat === "none") return "paid";

  const today = startOfDay(new Date());
  const due = startOfDay(new Date(bill.nextDueDate || bill.dueDate));

  if (due < today) return "overdue";
  return "upcoming";
}

export function billTimingLabel(bill: Bill) {
  const status = billRuntimeStatus(bill);
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";

  const diff = daysUntil(bill.nextDueDate || bill.dueDate);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `Due in ${diff} days`;
}

export function nextDueDate(date: string, repeat: Bill["repeat"]) {
  const due = new Date(date);
  const next = new Date(due);

  if (repeat === "weekly") next.setDate(due.getDate() + 7);
  else if (repeat === "monthly") next.setMonth(due.getMonth() + 1);
  else if (repeat === "yearly") next.setFullYear(due.getFullYear() + 1);

  return next.toISOString();
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
