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
  Mail,
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
  const [notice, setNotice] = useState<{
    title: string;
    description: string;
    tone: "error" | "success";
  } | null>(null);

  const busy = activeAction !== null;
  const signedIn = Boolean(sync.user);
  const validation = useMemo(() => validateAuth(email, password), [email, password]);
  const status = statusCopy(sync.mode);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();

    if (!auth) {
      showNotice("Firebase setup required", "Add env vars and restart the dev server.", "error");
      return;
    }

    if (validation) {
      showNotice(validation.title, validation.description, "error");
      return;
    }

    setActiveAction(mode);
    setNotice(null);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        showNotice("Signed in", "Your workspace is syncing across devices.", "success");
        toast.success("Welcome back", { description: "Cloud sync is active." });
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        showNotice("Account created", "Nova is ready to sync your data.", "success");
        toast.success("Account created", { description: "Cloud sync is ready." });
      }
      setPassword("");
    } catch (err) {
      const mapped = authErrorMessage(err);
      showNotice(mapped.title, mapped.description, "error");
      toast.error(mapped.title, { description: mapped.description });
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
      showNotice("Signed out", "This device is back to local-first mode.", "success");
      toast.success("Signed out", { description: "Local storage remains available." });
    } catch (err) {
      const mapped = authErrorMessage(err);
      showNotice(mapped.title, mapped.description, "error");
      toast.error(mapped.title, { description: mapped.description });
    } finally {
      setActiveAction(null);
    }
  }

  function showNotice(title: string, description: string, tone: "error" | "success") {
    setNotice({ title, description, tone });
  }

  return (
    <GlassCard className="mt-3 overflow-hidden rounded-[1.75rem] p-0">
      <div className="p-4 min-[380px]:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Cloud className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold">Cloud Sync</p>
              {(sync.mode === "loading" || sync.mode === "syncing") && (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {signedIn ? sync.user?.email : "Sign in to sync across devices"}
            </p>
          </div>
          <StatusBadge
            mode={sync.mode}
            label={signedIn && sync.mode !== "error" ? "Synced" : status.label}
          />
        </div>

        {!configured && (
          <Notice
            tone="error"
            title="Firebase setup required"
            description="Add VITE_FIREBASE_* values and restart Vite."
          />
        )}

        {notice && (
          <Notice tone={notice.tone} title={notice.title} description={notice.description} />
        )}
        {sync.error && !notice && (
          <Notice tone="error" title="Sync needs attention" description={sync.error} />
        )}

        {signedIn ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="size-4" />
                <p className="text-sm font-semibold">Synced workspace</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Last status: {status.description}. Changes save locally first, then sync to
                Firebase.
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
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/50 p-1">
              <ModeButton
                active={mode === "login"}
                disabled={busy}
                icon={LogIn}
                label="Login"
                onClick={() => setMode("login")}
              />
              <ModeButton
                active={mode === "signup"}
                disabled={busy}
                icon={UserPlus}
                label="Sign up"
                onClick={() => setMode("signup")}
              />
            </div>

            <FieldShell icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNotice(null);
                }}
                placeholder="Email address"
                autoComplete="email"
                disabled={busy}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
              />
            </FieldShell>

            <FieldShell icon={LockKeyhole}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setNotice(null);
                }}
                placeholder={mode === "login" ? "Password" : "Create password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={busy}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={busy}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </FieldShell>

            <button
              type="submit"
              disabled={!configured || busy}
              className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-40"
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
    </GlassCard>
  );
}

function FieldShell({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-2xl bg-muted/55 px-4 ring-1 ring-border/50 focus-within:ring-2 focus-within:ring-primary/45">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
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
        "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:opacity-50",
        active ? "gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function StatusBadge({ mode, label }: { mode: string; label: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
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

function Notice({
  tone,
  title,
  description,
}: {
  tone: "error" | "success";
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-2xl border p-3",
        tone === "error"
          ? "border-destructive/25 bg-destructive/10"
          : "border-primary/20 bg-primary/10",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2",
          tone === "error" ? "text-destructive" : "text-primary",
        )}
      >
        {tone === "error" ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function validateAuth(email: string, password: string) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) return { title: "Email required", description: "Enter your email address." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { title: "Invalid email", description: "Use a valid email address." };
  }
  if (!password) return { title: "Password required", description: "Enter your password." };
  if (password.length < 6) {
    return { title: "Password too short", description: "Use at least 6 characters." };
  }
  return null;
}

function authErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : "";
  const messages: Record<string, { title: string; description: string }> = {
    "auth/email-already-in-use": {
      title: "Email already in use",
      description: "Switch to Login to sync this account.",
    },
    "auth/invalid-email": { title: "Invalid email", description: "Check the email and try again." },
    "auth/weak-password": { title: "Weak password", description: "Use at least 6 characters." },
    "auth/user-not-found": {
      title: "Account not found",
      description: "Create an account to enable sync.",
    },
    "auth/wrong-password": {
      title: "Wrong password",
      description: "The password does not match this email.",
    },
    "auth/invalid-credential": {
      title: "Login failed",
      description: "Email or password is incorrect.",
    },
    "auth/network-request-failed": {
      title: "Network error",
      description: "Check your connection and try again.",
    },
    "auth/too-many-requests": {
      title: "Too many attempts",
      description: "Wait a moment and try again.",
    },
  };

  return (
    messages[code] || {
      title: "Authentication failed",
      description:
        error instanceof Error
          ? error.message.replace("Firebase: ", "").replace(/\s*\(auth\/.*\)\.?$/, ".")
          : "Please try again.",
    }
  );
}

function statusCopy(mode: string) {
  if (mode === "loading") return { label: "Loading", description: "Preparing cloud sync" };
  if (mode === "syncing") return { label: "Syncing", description: "Saving latest changes" };
  if (mode === "synced") return { label: "Synced", description: "Synced just now" };
  if (mode === "error") return { label: "Review", description: "Cloud sync needs attention" };
  return { label: "Local", description: "Local storage active" };
}
