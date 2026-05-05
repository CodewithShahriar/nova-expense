// Local storage layer for expense tracker
import { useSyncExternalStore } from "react";
import { billRuntimeStatus, nextDueDate } from "@/lib/bills";

export type TxType = "expense" | "income" | "transfer";
export type AccountType = "bank" | "cash" | "wallet" | "card";

export interface Account {
  id: string;
  order?: number;
  name: string; // e.g. "BRAC Bank"
  type: AccountType;
  brand?: string; // e.g. "VISA", "Mastercard", "bKash"
  number?: string; // demo account number (last 4-6 or full demo)
  balance: number; // current balance
  gradient: string; // css linear-gradient value for the card face
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string; // "Transfer" for transfer type
  note?: string;
  merchant?: string;
  receiptImage?: string;
  date: string; // ISO
  accountId?: string; // for expense/income
  fromAccountId?: string; // for transfer
  toAccountId?: string; // for transfer
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string;
}

export interface Bill {
  id: string;
  parentBillId?: string;
  name: string;
  amount: number;
  dueDate: string;
  nextDueDate?: string;
  repeat: "none" | "weekly" | "monthly" | "yearly";
  status: "upcoming" | "paid" | "overdue";
  category: string;
  accountId?: string;
  notes?: string;
  paidAt?: string;
  transactionId?: string;
  history?: boolean;
}

export interface CustomCategory {
  name: string;
  icon: string; // lucide icon name
  color: string; // oklch
  type: "expense" | "income" | "both";
}

export interface Settings {
  currency: string;
  theme: "dark" | "light";
  name: string;
  avatar?: string; // data URL
}

export interface AppState {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  bills: Bill[];
  goals: Goal[];
  customCategories: CustomCategory[];
  settings: Settings;
}

const KEY = "pocketledger:v2";

const defaultAccounts: Account[] = [
  {
    id: "acc-brac",
    order: 0,
    name: "BRAC Bank",
    type: "card",
    brand: "Visa Platinum",
    number: "4829 •••• •••• 3421",
    balance: 184500,
    gradient: "linear-gradient(135deg, oklch(0.42 0.15 25), oklch(0.28 0.12 15))",
  },
  {
    id: "acc-bankasia",
    order: 1,
    name: "Bank Asia",
    type: "card",
    brand: "Mastercard",
    number: "5218 •••• •••• 7788",
    balance: 92300,
    gradient: "linear-gradient(135deg, oklch(0.4 0.14 260), oklch(0.26 0.12 275))",
  },
  {
    id: "acc-cash",
    order: 2,
    name: "Cash Wallet",
    type: "cash",
    brand: "Cash",
    number: "— — —",
    balance: 4850,
    gradient: "linear-gradient(135deg, oklch(0.38 0.12 160), oklch(0.24 0.1 170))",
  },
  {
    id: "acc-bkash",
    order: 3,
    name: "bKash",
    type: "wallet",
    brand: "bKash Personal",
    number: "017•• ••• 842",
    balance: 12760,
    gradient: "linear-gradient(135deg, oklch(0.5 0.2 10), oklch(0.32 0.17 355))",
  },
];

const defaultState: AppState = {
  transactions: [],
  accounts: defaultAccounts,
  budgets: [
    { category: "Food", limit: 8000 },
    { category: "Transport", limit: 4000 },
    { category: "Shopping", limit: 6000 },
    { category: "Entertainment", limit: 2500 },
  ],
  bills: [],
  goals: [],
  customCategories: [],
  settings: { currency: "BDT", theme: "dark", name: "You" },
};

function read(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      accounts: normalizeAccounts(parsed.accounts?.length ? parsed.accounts : defaultAccounts),
      transactions: parsed.transactions || [],
      budgets: parsed.budgets || defaultState.budgets,
      bills: normalizeBills(parsed.bills || []),
      goals: parsed.goals || [],
      customCategories: parsed.customCategories || [],
      settings: { ...defaultState.settings, ...parsed.settings, currency: "BDT" },
    };
  } catch {
    return defaultState;
  }
}

let state: AppState = defaultState;
let initialized = false;
const listeners = new Set<() => void>();
const syncListeners = new Set<() => void>();
let cloudWriter: ((next: AppState) => Promise<void>) | null = null;
let applyingRemoteState = false;

export type SyncMode = "local" | "loading" | "syncing" | "synced" | "error";

export interface SyncStatus {
  mode: SyncMode;
  user: { uid: string; email: string | null } | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  mode: "local",
  user: null,
  error: null,
};

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    state = read();
    initialized = true;
  }
}

function write(next: AppState) {
  state = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
  if (cloudWriter && !applyingRemoteState) {
    cloudWriter(next).catch((error: unknown) => {
      setSyncStatus({ mode: "error", error: errorMessage(error) });
    });
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong while syncing.";
}

function normalizeState(next: Partial<AppState>): AppState {
  return {
    ...defaultState,
    ...next,
    transactions: next.transactions || [],
    accounts: normalizeAccounts(next.accounts?.length ? next.accounts : defaultAccounts),
    budgets: next.budgets || defaultState.budgets,
    bills: normalizeBills(next.bills || []),
    goals: next.goals || [],
    customCategories: next.customCategories || [],
    settings: { ...defaultState.settings, ...next.settings, currency: "BDT" },
  };
}

function normalizeAccounts(accounts: Account[]): Account[] {
  return accounts
    .map((account, index) => ({ ...account, order: account.order ?? index }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function registerCloudWriter(writer: ((next: AppState) => Promise<void>) | null) {
  cloudWriter = writer;
}

export function hasLocalSnapshot() {
  return typeof window !== "undefined" && Boolean(localStorage.getItem(KEY));
}

export function setSyncStatus(patch: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...patch };
  syncListeners.forEach((l) => l());
}

// Apply a transaction's effect on account balances
function applyTxBalance(accounts: Account[], tx: Transaction, sign: 1 | -1): Account[] {
  return accounts.map((a) => {
    if (tx.type === "expense" && a.id === tx.accountId)
      return { ...a, balance: a.balance - sign * tx.amount };
    if (tx.type === "income" && a.id === tx.accountId)
      return { ...a, balance: a.balance + sign * tx.amount };
    if (tx.type === "transfer") {
      if (a.id === tx.fromAccountId) return { ...a, balance: a.balance - sign * tx.amount };
      if (a.id === tx.toAccountId) return { ...a, balance: a.balance + sign * tx.amount };
    }
    return a;
  });
}

function normalizeBills(bills: Bill[]): Bill[] {
  return bills.map((bill) => {
    const nextBill = {
      ...bill,
      nextDueDate: bill.nextDueDate || bill.dueDate,
      repeat: bill.repeat || "none",
      status: bill.status || "upcoming",
      category: bill.category || "Bills",
    };

    return {
      ...nextBill,
      status: nextBill.history ? "paid" : billRuntimeStatus(nextBill),
    };
  });
}

export const store = {
  get: () => {
    ensureInit();
    return state;
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  replaceFromCloud: (next: Partial<AppState>) => {
    applyingRemoteState = true;
    write(normalizeState(next));
    applyingRemoteState = false;
  },

  addTransaction: (tx: Omit<Transaction, "id">) => {
    const t: Transaction = { ...tx, id: crypto.randomUUID() };
    const accounts = applyTxBalance(state.accounts, t, 1);
    write({ ...state, accounts, transactions: [t, ...state.transactions] });
  },
  updateTransaction: (id: string, patch: Partial<Transaction>) => {
    const existing = state.transactions.find((t) => t.id === id);
    if (!existing) return;
    let accounts = applyTxBalance(state.accounts, existing, -1); // revert
    const updated = { ...existing, ...patch };
    accounts = applyTxBalance(accounts, updated, 1);
    write({
      ...state,
      accounts,
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    });
  },
  deleteTransaction: (id: string) => {
    const existing = state.transactions.find((t) => t.id === id);
    if (!existing) return;
    const accounts = applyTxBalance(state.accounts, existing, -1);
    write({ ...state, accounts, transactions: state.transactions.filter((t) => t.id !== id) });
  },

  addAccount: (a: Omit<Account, "id">) => {
    write({
      ...state,
      accounts: [
        ...state.accounts,
        { ...a, id: crypto.randomUUID(), order: state.accounts.length },
      ],
    });
  },
  updateAccount: (id: string, patch: Partial<Account>) => {
    write({
      ...state,
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  },
  reorderAccounts: (ids: string[]) => {
    const byId = new Map(state.accounts.map((account) => [account.id, account]));
    const ordered: Account[] = [];
    ids.forEach((id, index) => {
      const account = byId.get(id);
      if (!account) return;
      byId.delete(id);
      ordered.push({ ...account, order: index });
    });
    const remaining = Array.from(byId.values()).map((account, index) => ({
      ...account,
      order: ordered.length + index,
    }));
    write({ ...state, accounts: [...ordered, ...remaining] });
  },
  deleteAccount: (id: string) => {
    // Remove transactions tied to this account, keep others
    const remaining = state.transactions.filter(
      (t) => t.accountId !== id && t.fromAccountId !== id && t.toAccountId !== id,
    );
    write({
      ...state,
      accounts: state.accounts.filter((a) => a.id !== id),
      transactions: remaining,
    });
  },

  setBudgets: (budgets: Budget[]) => write({ ...state, budgets }),
  upsertBudget: (b: Budget) => {
    const others = state.budgets.filter((x) => x.category !== b.category);
    write({ ...state, budgets: [...others, b] });
  },
  deleteBudget: (category: string) => {
    write({ ...state, budgets: state.budgets.filter((b) => b.category !== category) });
  },

  addBill: (bill: Omit<Bill, "id" | "status"> & { status?: Bill["status"] }) => {
    write({
      ...state,
      bills: [
        ...state.bills,
        {
          ...bill,
          id: crypto.randomUUID(),
          nextDueDate: bill.nextDueDate || bill.dueDate,
          status: bill.status || "upcoming",
        },
      ],
    });
  },
  updateBill: (id: string, patch: Partial<Bill>) => {
    write({
      ...state,
      bills: state.bills.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)),
    });
  },
  deleteBill: (id: string) => {
    write({ ...state, bills: state.bills.filter((bill) => bill.id !== id) });
  },
  markBillPaid: (id: string) => {
    const bill = state.bills.find((item) => item.id === id);
    if (!bill || bill.history || (bill.status === "paid" && bill.repeat === "none")) return;

    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: "expense",
      amount: bill.amount,
      category: bill.category || "Bills",
      note: bill.notes || bill.name,
      date: new Date().toISOString(),
      accountId: bill.accountId,
    };
    const accounts = applyTxBalance(state.accounts, tx, 1);
    const paidAt = tx.date;
    const paidRecord: Bill = {
      ...bill,
      id: crypto.randomUUID(),
      parentBillId: bill.parentBillId || bill.id,
      dueDate: bill.nextDueDate || bill.dueDate,
      nextDueDate: bill.nextDueDate || bill.dueDate,
      status: "paid",
      paidAt,
      transactionId: tx.id,
      history: true,
    };

    write({
      ...state,
      accounts,
      transactions: [tx, ...state.transactions],
      bills:
        bill.repeat === "none"
          ? state.bills.map((item) => (item.id === id ? nextBillCycle(item, paidAt, tx.id) : item))
          : [
              ...state.bills.map((item) =>
                item.id === id ? nextBillCycle(item, paidAt, tx.id) : item,
              ),
              paidRecord,
            ],
    });
  },

  addCustomCategory: (c: CustomCategory) => {
    if (state.customCategories.find((x) => x.name.toLowerCase() === c.name.toLowerCase())) return;
    write({ ...state, customCategories: [...state.customCategories, c] });
  },
  deleteCustomCategory: (name: string) => {
    write({ ...state, customCategories: state.customCategories.filter((c) => c.name !== name) });
  },

  addGoal: (g: Omit<Goal, "id">) => {
    write({ ...state, goals: [...state.goals, { ...g, id: crypto.randomUUID() }] });
  },
  updateGoal: (id: string, patch: Partial<Goal>) => {
    write({ ...state, goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  },
  deleteGoal: (id: string) => {
    write({ ...state, goals: state.goals.filter((g) => g.id !== id) });
  },

  updateSettings: (patch: Partial<Settings>) => {
    write({ ...state, settings: { ...state.settings, ...patch } });
  },

  seedDemo: () => {
    if (state.transactions.length > 0) return;
    const now = new Date();
    const mk = (
      days: number,
      hours: number,
      type: TxType,
      amount: number,
      category: string,
      note: string,
      accountId?: string,
      fromId?: string,
      toId?: string,
    ): Transaction => ({
      id: crypto.randomUUID(),
      type,
      amount,
      category,
      note,
      date: new Date(now.getTime() - days * 86400000 - hours * 3600000).toISOString(),
      accountId,
      fromAccountId: fromId,
      toAccountId: toId,
    });
    const demo: Transaction[] = [
      mk(0, 2, "expense", 320, "Food", "Coffee & snacks", "acc-bkash"),
      mk(0, 5, "expense", 850, "Transport", "Uber to office", "acc-brac"),
      mk(1, 3, "expense", 4200, "Shopping", "Running shoes", "acc-brac"),
      mk(1, 10, "income", 85000, "Salary", "Monthly salary", "acc-brac"),
      mk(2, 4, "expense", 1240, "Food", "Dinner — Sultan's", "acc-cash"),
      mk(2, 8, "transfer", 5000, "Transfer", "To bKash", undefined, "acc-brac", "acc-bkash"),
      mk(3, 2, "expense", 550, "Entertainment", "Movie night", "acc-bkash"),
      mk(4, 6, "expense", 6200, "Bills", "Electricity", "acc-bankasia"),
      mk(5, 1, "expense", 380, "Food", "Lunch", "acc-cash"),
      mk(7, 12, "income", 18000, "Freelance", "Design gig", "acc-bankasia"),
      mk(8, 5, "expense", 2800, "Shopping", "Groceries", "acc-brac"),
      mk(10, 3, "expense", 1500, "Health", "Pharmacy", "acc-bkash"),
    ];
    // Apply balances for seeded transactions
    let accounts = state.accounts;
    for (const t of demo) accounts = applyTxBalance(accounts, t, 1);
    write({ ...state, accounts, transactions: demo });
  },
};

function nextBillCycle(bill: Bill, paidAt: string, transactionId: string): Bill {
  if (bill.repeat === "none") {
    return {
      ...bill,
      status: "paid",
      paidAt,
      transactionId,
      nextDueDate: bill.nextDueDate || bill.dueDate,
      history: true,
    };
  }

  const currentDue = bill.nextDueDate || bill.dueDate;
  const next = nextDueDate(currentDue, bill.repeat);

  return {
    ...bill,
    dueDate: next,
    nextDueDate: next,
    status: "upcoming",
    paidAt,
    transactionId,
  };
}

export function useStore<T>(selector: (s: AppState) => T): T {
  ensureInit();
  const snapshot = useSyncExternalStore(store.subscribe, store.get, () => defaultState);

  return selector(snapshot);
}

export function useSyncStatus<T>(selector: (s: SyncStatus) => T): T {
  const snapshot = useSyncExternalStore(
    (listener) => {
      syncListeners.add(listener);
      return () => syncListeners.delete(listener);
    },
    () => syncStatus,
    () => syncStatus,
  );

  return selector(snapshot);
}

export const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CAD: "$",
  AUD: "$",
  BDT: "৳",
  PKR: "₨",
};

export function formatMoney(amount: number, currency = "BDT", compact = false) {
  const sym = currencySymbols[currency] || currency + " ";
  const abs = Math.abs(amount);
  if (compact && abs >= 1000) {
    if (abs >= 100000)
      return `${amount < 0 ? "-" : ""}${sym}${(abs / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
    return `${amount < 0 ? "-" : ""}${sym}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
  return `${amount < 0 ? "-" : ""}${sym}${abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function accountById(accounts: Account[], id?: string) {
  return accounts.find((a) => a.id === id);
}
