import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Smartphone, Wifi, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "nova:pwa-install-dismissed";

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem(DISMISS_KEY) === "1",
  );
  const [installed, setInstalled] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const standalone = useMemo(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true),
    [],
  );

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }

    function onInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    function updateOnline() {
      setOnline(navigator.onLine);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  const showInstall = installEvent && !dismissed && !standalone && !installed;

  return (
    <>
      <div
        className={cn(
          "fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-card backdrop-blur-xl transition",
          online
            ? "border-primary/20 bg-primary/15 text-primary"
            : "border-warning/25 bg-warning/15 text-warning",
        )}
        style={!online ? { color: "var(--color-warning)" } : undefined}
      >
        {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
        {online ? "Online" : "Offline mode"}
      </div>

      {showInstall && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[65] mx-auto max-w-lg animate-slide-up">
          <div className="glass-strong overflow-hidden rounded-3xl p-4 shadow-elegant">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow">
                <Smartphone className="size-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Install Nova Expense</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Add Nova to your home screen for faster launch, offline access, and Quick Add
                  shortcuts.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={install}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl gradient-primary text-xs font-semibold text-primary-foreground"
                  >
                    <Download className="size-4" />
                    Install
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="flex h-10 w-11 items-center justify-center rounded-xl glass text-muted-foreground"
                    aria-label="Dismiss install prompt"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {installed && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[65] mx-auto max-w-lg animate-slide-up">
          <div className="glass-strong flex items-center gap-3 rounded-3xl p-4 shadow-elegant">
            <CheckCircle2 className="size-5 text-primary" />
            <p className="text-sm font-semibold">Nova Expense installed</p>
          </div>
        </div>
      )}
    </>
  );
}
