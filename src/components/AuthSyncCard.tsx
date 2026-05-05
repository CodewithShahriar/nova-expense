import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Cloud, LogIn, LogOut, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useSyncStatus } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function AuthSyncCard() {
  const sync = useSyncStatus((s) => s);
  const configured = isFirebaseConfigured();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Add Firebase env vars to enable cloud sync.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      setPassword("");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setBusy(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const statusText =
    sync.mode === "loading"
      ? "Preparing cloud sync"
      : sync.mode === "syncing"
        ? "Syncing changes"
        : sync.mode === "synced"
          ? "Synced across devices"
          : "Local storage only";

  return (
    <GlassCard className="mt-3 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Cloud className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Cloud sync</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {sync.user?.email || statusText}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
            sync.mode === "error"
              ? "bg-destructive/15 text-destructive"
              : sync.mode === "synced"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          {sync.mode}
        </span>
      </div>

      {!configured && (
        <p className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
          Firebase is not configured yet. Add your Vite Firebase environment variables to enable
          login and sync.
        </p>
      )}

      {sync.user ? (
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl glass text-sm font-semibold disabled:opacity-50"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "h-10 rounded-xl text-xs font-semibold",
                mode === "login"
                  ? "gradient-primary text-primary-foreground"
                  : "glass text-muted-foreground",
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "h-10 rounded-xl text-xs font-semibold",
                mode === "signup"
                  ? "gradient-primary text-primary-foreground"
                  : "glass text-muted-foreground",
              )}
            >
              Sign up
            </button>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            disabled={!configured || busy || !email.trim() || password.length < 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            {busy ? "Please wait" : mode === "login" ? "Login and sync" : "Create account"}
          </button>
        </form>
      )}

      {(error || sync.error) && (
        <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
          {error || sync.error}
        </p>
      )}
    </GlassCard>
  );
}

function authErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Authentication failed.";
  return error.message.replace("Firebase: ", "").replace(/\s*\(auth\/.*\)\.?$/, ".");
}
