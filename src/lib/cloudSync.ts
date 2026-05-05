import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
  type WriteBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  registerCloudWriter,
  hasLocalSnapshot,
  setSyncStatus,
  store,
  type Account,
  type AppState,
  type Bill,
  type Budget,
  type CustomCategory,
  type Goal,
  type Settings,
  type Transaction,
} from "@/lib/storage";

type RemoteState = Partial<AppState> & { hasAnyData: boolean };

const COLLECTIONS = {
  accounts: "accounts",
  transactions: "transactions",
  budgets: "budgets",
  bills: "bills",
} as const;

let initialized = false;
let activeUser: User | null = null;
let syncTimer: number | null = null;
let remoteUnsubscribers: Unsubscribe[] = [];
let pendingOnlineState: AppState | null = null;

export function initCloudSync() {
  if (initialized) return;
  initialized = true;

  if (!isFirebaseConfigured()) {
    setSyncStatus({
      mode: "local",
      user: null,
      error: "Firebase env vars are missing. Local storage fallback is active.",
    });
    return;
  }

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    setSyncStatus({
      mode: "local",
      user: null,
      error: "Firebase could not be initialized. Local storage fallback is active.",
    });
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    clearRemoteListeners();
    activeUser = user;

    if (!user) {
      registerCloudWriter(null);
      setSyncStatus({ mode: "local", user: null, error: null });
      return;
    }

    const syncUser = { uid: user.uid, email: user.email };
    setSyncStatus({ mode: "loading", user: syncUser, error: null });

    try {
      const localState = store.get();
      const remoteState = await readRemoteState(db, user);
      const nextState =
        remoteState.hasAnyData && hasLocalSnapshot()
          ? mergeStates(localState, remoteState)
          : remoteState.hasAnyData
            ? remoteState
            : localState;

      store.replaceFromCloud(nextState);
      const syncedState = store.get();
      await writeRemoteState(db, user, syncedState);
      registerCloudWriter((state) => scheduleRemoteWrite(db, user, state));
      attachRemoteListeners(db, user, syncedState);
      setSyncStatus({ mode: "synced", user: syncUser, error: null });
    } catch (error) {
      registerCloudWriter(null);
      setSyncStatus({ mode: "error", user: syncUser, error: errorMessage(error) });
    }
  });

  window.addEventListener("online", () => {
    if (!activeUser || !pendingOnlineState) return;
    const next = pendingOnlineState;
    pendingOnlineState = null;
    scheduleRemoteWrite(db, activeUser, next).catch((error: unknown) => {
      pendingOnlineState = next;
      setSyncStatus({ mode: "error", error: errorMessage(error) });
    });
  });
}

function userDoc(db: Firestore, user: User) {
  return doc(db, "users", user.uid);
}

function userCollection(db: Firestore, user: User, name: string) {
  return collection(db, "users", user.uid, name);
}

async function scheduleRemoteWrite(db: Firestore, user: User, state: AppState) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    pendingOnlineState = state;
    setSyncStatus({
      mode: "error",
      user: { uid: user.uid, email: user.email },
      error: "You are offline. Changes are saved locally and will sync when you reconnect.",
    });
    return;
  }

  if (syncTimer) window.clearTimeout(syncTimer);

  setSyncStatus({
    mode: "syncing",
    user: { uid: user.uid, email: user.email },
    error: null,
  });

  await new Promise<void>((resolve, reject) => {
    syncTimer = window.setTimeout(() => {
      writeRemoteState(db, user, state)
        .then(() => {
          pendingOnlineState = null;
          setSyncStatus({
            mode: "synced",
            user: { uid: user.uid, email: user.email },
            error: null,
          });
          resolve();
        })
        .catch((error) => {
          pendingOnlineState = state;
          reject(error);
        });
    }, 450);
  });
}

async function readRemoteState(db: Firestore, user: User): Promise<RemoteState> {
  const [accountsSnap, txSnap, budgetsSnap, billsSnap] = await Promise.all([
    getDocs(userCollection(db, user, COLLECTIONS.accounts)),
    getDocs(userCollection(db, user, COLLECTIONS.transactions)),
    getDocs(userCollection(db, user, COLLECTIONS.budgets)),
    getDocs(userCollection(db, user, COLLECTIONS.bills)),
  ]);

  const currentUserDoc = await getDoc(userDoc(db, user));
  const userData = currentUserDoc.data();

  return {
    accounts: accountsSnap.docs.map((d) => accountFromDoc(d.data(), d.id)),
    transactions: txSnap.docs.map((d) => transactionFromDoc(d.data(), d.id)),
    budgets: budgetsSnap.docs.map((d) => budgetFromDoc(d.data())),
    bills: billsSnap.docs.map((d) => billFromDoc(d.data(), d.id)),
    goals: (userData?.goals as Goal[] | undefined) || [],
    customCategories: (userData?.customCategories as CustomCategory[] | undefined) || [],
    settings: userData?.settings as Settings | undefined,
    hasAnyData: Boolean(
      currentUserDoc.exists() ||
      accountsSnap.size ||
      txSnap.size ||
      budgetsSnap.size ||
      billsSnap.size,
    ),
  };
}

async function writeRemoteState(db: Firestore, user: User, state: AppState) {
  if (activeUser?.uid !== user.uid) return;

  const batch = writeBatch(db);
  batch.set(
    userDoc(db, user),
    {
      ...cleanForFirestore({
        email: user.email,
        settings: state.settings,
        goals: state.goals,
        customCategories: state.customCategories,
      }),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await syncCollection(db, user, COLLECTIONS.accounts, state.accounts, (item) => item.id, batch);
  await syncCollection(
    db,
    user,
    COLLECTIONS.transactions,
    state.transactions,
    (item) => item.id,
    batch,
  );
  await syncCollection(db, user, COLLECTIONS.bills, state.bills, (item) => item.id, batch);
  await syncCollection(db, user, COLLECTIONS.budgets, state.budgets, budgetDocId, batch);

  await batch.commit();
}

async function syncCollection<T>(
  db: Firestore,
  user: User,
  name: string,
  items: T[],
  idFor: (item: T) => string,
  batch: WriteBatch,
) {
  const ref = userCollection(db, user, name);
  const remote = await getDocs(ref);
  const nextIds = new Set(items.map(idFor));

  remote.docs.forEach((remoteDoc) => {
    if (!nextIds.has(remoteDoc.id)) {
      batch.delete(doc(db, "users", user.uid, name, remoteDoc.id));
    }
  });

  items.forEach((item) => {
    const payload = cleanForFirestore(item) as Record<string, unknown>;
    if (name === COLLECTIONS.bills && "repeat" in payload) {
      payload.repeatType = payload.repeat;
    }

    batch.set(
      doc(db, "users", user.uid, name, idFor(item)),
      { ...payload, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
}

function attachRemoteListeners(db: Firestore, user: User, initialState: AppState) {
  const cached: AppState = { ...initialState };

  const apply = () => {
    store.replaceFromCloud(cached);
    setSyncStatus({
      mode: "synced",
      user: { uid: user.uid, email: user.email },
      error: null,
    });
  };

  remoteUnsubscribers = [
    onSnapshot(
      userDoc(db, user),
      (snapshot) => {
        const data = snapshot.data();
        if (data?.settings) cached.settings = data.settings as Settings;
        if (Array.isArray(data?.goals)) cached.goals = data.goals as Goal[];
        if (Array.isArray(data?.customCategories)) {
          cached.customCategories = data.customCategories as CustomCategory[];
        }
        apply();
      },
      syncError,
    ),
    onSnapshot(
      userCollection(db, user, COLLECTIONS.accounts),
      (snapshot) => {
        cached.accounts = snapshot.docs.map((d) => accountFromDoc(d.data(), d.id));
        apply();
      },
      syncError,
    ),
    onSnapshot(
      userCollection(db, user, COLLECTIONS.transactions),
      (snapshot) => {
        cached.transactions = snapshot.docs
          .map((d) => transactionFromDoc(d.data(), d.id))
          .sort((a, b) => +new Date(b.date) - +new Date(a.date));
        apply();
      },
      syncError,
    ),
    onSnapshot(
      userCollection(db, user, COLLECTIONS.budgets),
      (snapshot) => {
        cached.budgets = snapshot.docs.map((d) => budgetFromDoc(d.data()));
        apply();
      },
      syncError,
    ),
    onSnapshot(
      userCollection(db, user, COLLECTIONS.bills),
      (snapshot) => {
        cached.bills = snapshot.docs.map((d) => billFromDoc(d.data(), d.id));
        apply();
      },
      syncError,
    ),
  ];
}

function clearRemoteListeners() {
  remoteUnsubscribers.forEach((unsubscribe) => unsubscribe());
  remoteUnsubscribers = [];
  if (syncTimer) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }
}

function syncError(error: unknown) {
  setSyncStatus({ mode: "error", error: errorMessage(error) });
}

function mergeStates(local: AppState, remote: Partial<AppState>): AppState {
  return {
    ...local,
    ...remote,
    accounts: mergeById(local.accounts, remote.accounts || []),
    transactions: mergeById(local.transactions, remote.transactions || []).sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    ),
    budgets: mergeByKey(local.budgets, remote.budgets || [], (b) => b.category),
    bills: mergeById(local.bills, remote.bills || []),
    goals: mergeById(local.goals, remote.goals || []),
    customCategories: mergeByKey(local.customCategories, remote.customCategories || [], (c) =>
      c.name.toLowerCase(),
    ),
    settings: { ...local.settings, ...remote.settings, currency: "BDT" },
  };
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]) {
  const map = new Map<string, T>();
  local.forEach((item) => map.set(item.id, item));
  remote.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function mergeByKey<T>(local: T[], remote: T[], keyFor: (item: T) => string) {
  const map = new Map<string, T>();
  local.forEach((item) => map.set(keyFor(item), item));
  remote.forEach((item) => map.set(keyFor(item), item));
  return Array.from(map.values());
}

function accountFromDoc(data: DocumentData, id: string): Account {
  return {
    id,
    name: data.name || "Account",
    type: data.type || "bank",
    brand: data.brand,
    number: data.number,
    balance: Number(data.balance || 0),
    gradient: data.gradient || "linear-gradient(135deg, oklch(0.38 0.12 160), oklch(0.24 0.1 170))",
  };
}

function transactionFromDoc(data: DocumentData, id: string): Transaction {
  return {
    id,
    type: data.type || "expense",
    amount: Number(data.amount || 0),
    category: data.category || "Other",
    note: data.note,
    date: data.date || new Date().toISOString(),
    accountId: data.accountId,
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
  };
}

function budgetFromDoc(data: DocumentData): Budget {
  return {
    category: data.category || "Other",
    limit: Number(data.limit || 0),
  };
}

function billFromDoc(data: DocumentData, id: string): Bill {
  const status = data.status || (data.paid ? "paid" : "upcoming");

  return {
    id,
    name: data.name || "Bill",
    amount: Number(data.amount || 0),
    dueDate: data.dueDate || new Date().toISOString(),
    nextDueDate: data.nextDueDate || data.dueDate || new Date().toISOString(),
    repeat: data.repeat || data.repeatType || "none",
    status,
    category: data.category || "Bills",
    accountId: data.accountId,
    notes: data.notes,
    paidAt: data.paidAt,
    transactionId: data.transactionId,
    parentBillId: data.parentBillId,
    history: Boolean(data.history),
  };
}

function budgetDocId(budget: Budget) {
  return encodeURIComponent(budget.category);
}

function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, child) => (child === undefined ? null : child)));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong while syncing.";
}
