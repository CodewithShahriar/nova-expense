import { useRef, useState } from "react";
import { Camera, Check, FileImage, Loader2, ScanLine, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AccountSelect } from "@/components/AccountSelect";
import { DatePicker } from "@/components/DatePicker";
import { allCategories } from "@/lib/categories";
import { resizeReceiptImage, scanReceiptImage, type ReceiptOcrResult } from "@/lib/receiptOcr";
import { formatMoney, store, type Account, type CustomCategory } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function ReceiptScanner({
  accounts,
  customCategories,
  currency,
  onClose,
  onSaved,
}: {
  accounts: Account[];
  customCategories: CustomCategory[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const categories = allCategories(customCategories).filter(
    (category) => category.type !== "income",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString());
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Food");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [note, setNote] = useState("");

  async function processFile(file?: File) {
    if (!file) return;
    setScanning(true);
    setDone(false);
    setRawText("");

    try {
      const resized = await resizeReceiptImage(file);
      setPreview(resized);
      const result = await scanReceiptImage(resized);
      applyResult(result);
      setDone(true);
      toast.success("Receipt scanned", {
        description: result.amount
          ? `Detected ${formatMoney(result.amount, currency)}. Review before saving.`
          : "Review the extracted details before saving.",
      });
    } catch {
      toast.error("Image not clear", {
        description: "Could not read this receipt. Try a sharper photo or better lighting.",
      });
    } finally {
      setScanning(false);
    }
  }

  function applyResult(result: ReceiptOcrResult) {
    setRawText(result.rawText);
    if (result.amount) setAmount(String(result.amount));
    if (result.date) setDate(result.date);
    if (result.merchant) {
      setMerchant(result.merchant);
      setNote(result.merchant);
    }

    if (!result.amount) {
      toast.error("Could not detect amount", {
        description: "Enter the total manually before saving.",
      });
    }
  }

  function save() {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast.error("Amount required", { description: "Enter the receipt total before saving." });
      return;
    }
    if (!accountId) {
      toast.error("Select an account", { description: "Choose which account paid this receipt." });
      return;
    }

    store.addTransaction({
      type: "expense",
      amount: value,
      category,
      note: note.trim() || merchant.trim() || "Receipt scan",
      merchant: merchant.trim() || undefined,
      date,
      accountId,
      receiptImage: preview || undefined,
    });
    toast.success("Expense saved", {
      description: "Receipt details were added to your transactions.",
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-elegant">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <ScanLine className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">Scan receipt</p>
              <p className="text-xs text-muted-foreground">Extract amount, date, and merchant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full glass"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground"
          >
            <Camera className="size-4" />
            Camera
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl glass text-sm font-semibold"
          >
            <Upload className="size-4" />
            Upload
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => processFile(e.target.files?.[0])}
          className="hidden"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => processFile(e.target.files?.[0])}
          className="hidden"
        />

        <div className="mt-4 overflow-hidden rounded-3xl bg-muted/45">
          {preview ? (
            <img src={preview} alt="Receipt preview" className="max-h-72 w-full object-cover" />
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
              <FileImage className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Capture or upload a clear receipt image.
              </p>
            </div>
          )}
        </div>

        {scanning && (
          <div className="mt-4 rounded-2xl bg-primary/10 p-4">
            <div className="flex items-center gap-3 text-primary">
              <Loader2 className="size-5 animate-spin" />
              <p className="text-sm font-semibold">Scanning receipt...</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Optimizing image and reading text in the browser.
            </p>
          </div>
        )}

        {done && (
          <div className="mt-4 rounded-2xl bg-primary/10 p-4">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles className="size-5" />
              <p className="text-sm font-semibold">Details extracted</p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent text-sm outline-none"
              />
            </Field>
            <Field label="Merchant">
              <input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Store name"
                className="w-full bg-transparent text-sm outline-none"
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Date</p>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Account</p>
            <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.slice(0, 12).map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setCategory(item.name)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3 text-xs font-semibold",
                  category === item.name
                    ? "gradient-primary text-primary-foreground"
                    : "glass text-muted-foreground",
                )}
              >
                {item.name}
              </button>
            ))}
          </div>

          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="w-full bg-transparent text-sm outline-none"
            />
          </Field>

          {rawText && (
            <details className="rounded-2xl bg-muted/35 p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-semibold text-foreground">
                Raw OCR text
              </summary>
              <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-mono">
                {rawText}
              </pre>
            </details>
          )}

          <button
            type="button"
            onClick={save}
            disabled={scanning}
            className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Check className="size-4" />
            Save expense
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-muted/55 px-4 py-3 ring-1 ring-border/50 focus-within:ring-2 focus-within:ring-primary/45">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
