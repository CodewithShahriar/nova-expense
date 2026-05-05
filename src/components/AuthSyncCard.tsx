import { useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useSyncStatus } from "@/lib/storage";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";
type AuthAction = AuthMode | "logout" | null;

export function AuthSyncCard() {
  const sync = useSyncStatus((s) => s);
  const configured = isFirebaseConfigured();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);

  const busy = activeAction !== null;
  const validation = useMemo(() => validateAuth(email, password), [email, password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();

    if (!auth) {
      showError(
        "Firebase setup required",
        "Add your Firebase env vars and restart the dev server.",
      );
      return;
    }

    if (validation) {
      showError(validation.title, validation.description);
      return;
    }

    setActiveAction(mode);
    setNotice(null);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        toast.success("Welcome back", {
          description: "Your encrypted workspace is syncing across devices.",
        });
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        toast.success("Account created", {
          description: "Cloud sync is ready for this expense workspace.",
        });
      }
      setPassword("");
    } catch (err) {
      const mapped = authErrorMessage(err);
      showError(mapped.title, mapped.description);
    } finally {
      setActiveAction(null);
    }
  }

  async function logout() {
    const auth = getFirebaseAuth();
    if (!auth) return;

    setActiveAction("logout");
    setNotice(null);

    try {
      await signOut(auth);
      toast.success("Signed out", {
        description: "This device will keep using local storage until you log in again.",
      });
    } catch (err) {
      const mapped = authErrorMessage(err);
      showError(mapped.title, mapped.description);
    } finally {
      setActiveAction(null);
    }
  }

  function showError(title: string, description: string) {
    setNotice({ title, description });
    toast.error(title, { description });
  }

  const status = statusCopy(sync.mode);
  const signedIn = Boolean(sync.user);

  return (
    <GlassCard className="mt-3 overflow-hidden p-0">
      <div className="relative p-4">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-25"
          style={{ background: "var(--gradient-primary)" }}
          aria-hidden
        />
        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <ShieldCheck className="size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Cloud sync</p>
                {sync.mode === "syncing" || sync.mode === "loading" ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {signedIn ? sync.user?.email : status.description}
              </p>
            </div>
            <StatusBadge
              mode={sync.mode}
              label={signedIn && sync.mode !== "error" ? "Synced" : status.label}
            />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatusMetric label="Mode" value={signedIn ? "Cloud" : "Local"} />
            <StatusMetric label="Security" value="Private" />
            <StatusMetric
              label="State"
              value={sync.mode === "error" ? "Review" : signedIn ? "Synced" : "Ready"}
            />
          </div>

          {!configured && (
            <PremiumAlert
              tone="warning"
              title="Firebase setup required"
              description="Add VITE_FIREBASE_* values to .env.local and restart the Vite dev server."
            />
          )}

          {notice && (
            <PremiumAlert tone="error" title={notice.title} description={notice.description} />
          )}

          {sync.error && !notice && (
            <PremiumAlert
              tone="error"
              title="Cloud sync needs attention"
              description={sync.error}
            />
          )}

          {signedIn ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-primary/10 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="size-4" />
                  <p className="text-sm font-semibold">Protected workspace</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your accounts, transactions, budgets, and bills are connected to this login.
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl glass text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
              >
                {activeAction === "logout" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                {activeAction === "logout" ? "Signing out" : "Sign out"}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1">
                <ModeButton
                  active={mode === "login"}
                  disabled={busy}
                  icon={LogIn}
                  label="Login"
                  onClick={() => {
                    setMode("login");
                    setNotice(null);
                  }}
                />
                <ModeButton
                  active={mode === "signup"}
                  disabled={busy}
                  icon={UserPlus}
                  label="Sign up"
                  onClick={() => {
                    setMode("signup");
                    setNotice(null);
                  }}
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setNotice(null);
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={busy}
                  className="glass h-12 w-full rounded-2xl px-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Password
                </span>
                <div className="glass flex h-12 items-center gap-2 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-primary/50">
                  <LockKeyhole className="size-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setNotice(null);
                    }}
                    placeholder={mode === "login" ? "Your password" : "At least 6 characters"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={busy}
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={!configured || busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-40"
              >
                {activeAction === mode ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : mode === "login" ? (
                  <LogIn className="size-4" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {activeAction === mode
                  ? mode === "login"
                    ? "Logging in"
                    : "Creating account"
                  : mode === "login"
                    ? "Login and sync"
                    : "Create secure account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function ModeButton({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: typeof LogIn;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition disabled:opacity-50",
        active ? "gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function StatusBadge({ mode, label }: { mode: string; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        mode === "error"
          ? "bg-destructive/15 text-destructive"
          : mode === "synced"
            ? "bg-primary/15 text-primary"
            : mode === "syncing" || mode === "loading"
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground",
      )}
      style={
        mode === "syncing" || mode === "loading" ? { color: "var(--color-warning)" } : undefined
      }
    >
      {label}
    </span>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function PremiumAlert({
  tone,
  title,
  description,
}: {
  tone: "error" | "warning";
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "mt-3 rounded-2xl border p-3",
        tone === "error"
          ? "border-destructive/25 bg-destructive/10"
          : "border-warning/25 bg-warning/10",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2",
          tone === "error" ? "text-destructive" : "text-warning",
        )}
        style={tone === "warning" ? { color: "var(--color-warning)" } : undefined}
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function validateAuth(email: string, password: string) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return {
      title: "Email required",
      description: "Enter the email address connected to your cloud workspace.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return {
      title: "Invalid email",
      description: "Use a valid email address, like you@example.com.",
    };
  }

  if (!password) {
    return {
      title: "Password required",
      description: "Enter your password to continue securely.",
    };
  }

  if (password.length < 6) {
    return {
      title: "Password too short",
      description: "Firebase requires at least 6 characters for passwords.",
    };
  }

  return null;
}

function authErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : "";

  const messages: Record<string, { title: string; description: string }> = {
    "auth/email-already-in-use": {
      title: "Email already in use",
      description: "This email already has an account. Switch to Login to sync your data.",
    },
    "auth/invalid-email": {
      title: "Invalid email",
      description: "Check the email address and try again.",
    },
    "auth/weak-password": {
      title: "Weak password",
      description: "Choose a password with at least 6 characters.",
    },
    "auth/user-not-found": {
      title: "Account not found",
      description: "No account exists for this email. Create one to enable cloud sync.",
    },
    "auth/wrong-password": {
      title: "Wrong password",
      description: "The password does not match this email. Try again carefully.",
    },
    "auth/invalid-credential": {
      title: "Login failed",
      description: "The email or password is incorrect. Check both and try again.",
    },
    "auth/network-request-failed": {
      title: "Network error",
      description: "Check your connection and try again.",
    },
    "auth/too-many-requests": {
      title: "Too many attempts",
      description: "Firebase temporarily paused this login. Wait a moment and try again.",
    },
  };

  return (
    messages[code] || {
      title: "Authentication failed",
      description:
        error instanceof Error
          ? error.message.replace("Firebase: ", "").replace(/\s*\(auth\/.*\)\.?$/, ".")
          : "Something went wrong. Please try again.",
    }
  );
}

function statusCopy(mode: string) {
  if (mode === "loading") return { label: "Loading", description: "Preparing cloud sync" };
  if (mode === "syncing") return { label: "Syncing", description: "Saving your latest changes" };
  if (mode === "synced") return { label: "Synced", description: "Synced across devices" };
  if (mode === "error") return { label: "Review", description: "Cloud sync needs attention" };
  return { label: "Local", description: "Login to sync across devices" };
}
