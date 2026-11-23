export interface ReceiptOcrResult {
  rawText: string;
  amount?: number;
  date?: string;
  merchant?: string;
  note?: string;
  source?: "local" | "ai";
  confidence?: Partial<Record<"merchant" | "date" | "amount" | "items", number>>;
  items?: ReceiptItem[];
  candidateAmounts?: number[];
  candidateMerchants?: string[];
}

export interface ReceiptItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface ReceiptImageVariants {
  preview: string;
  scan: string;
}

export async function prepareReceiptImages(
  file: File,
  maxWidth = 1800,
): Promise<ReceiptImageVariants> {
  const preview = await fileToDataUrl(file);
  const image = await loadImage(preview);
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, width, height);
  enhanceReceiptCanvas(ctx, width, height);

  return {
    preview,
    scan: canvas.toDataURL("image/jpeg", 0.92),
  };
}

export async function resizeReceiptImage(file: File, maxWidth = 1800): Promise<string> {
  return prepareReceiptImages(file, maxWidth).then((images) => images.scan);
}

export async function scanReceiptImage(imageDataUrl: string): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "4", // Single column with variable text sizes, best for receipts
      preserve_interword_spaces: "1",
    });
    const {
      data: { text },
    } = await worker.recognize(imageDataUrl);
    return parseReceiptText(text);
  } finally {
    await worker.terminate();
  }
}

export async function scanReceiptImageWithAi(
  imageDataUrl: string,
  rawText?: string,
): Promise<ReceiptOcrResult> {
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, ocrText: rawText }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "AI receipt scan failed.");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("AI receipt scan endpoint is not available.");
  }

  return normalizeAiReceipt(payload, rawText);
}

export function parseReceiptText(rawText: string): ReceiptOcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const { amount, candidateAmounts } = extractAmounts(lines);
  const { merchant, candidateMerchants } = extractMerchants(lines);
  const date = parseDate(lines);
  const note = parseNote(lines);

  return {
    rawText,
    source: "local",
    amount,
    date,
    merchant,
    note,
    candidateAmounts,
    candidateMerchants,
  };
}

function normalizeAiReceipt(
  payload: {
    merchant?: string | null;
    date?: string | null;
    total?: number | null;
    note?: string | null;
    items?: Array<{
      name?: string;
      quantity?: number | null;
      unit_price?: number | null;
      total?: number | null;
    }>;
    confidence?: {
      merchant?: number;
      date?: number;
      total?: number;
      items?: number;
    };
  },
  rawText?: string,
): ReceiptOcrResult {
  const items = (payload.items || [])
    .filter((item) => item.name?.trim())
    .map((item) => ({
      name: item.name!.trim(),
      quantity: numberOrUndefined(item.quantity),
      unitPrice: numberOrUndefined(item.unit_price),
      total: numberOrUndefined(item.total),
    }));

  const note =
    payload.note?.trim() ||
    items
      .map((item) => item.name)
      .slice(0, 3)
      .join(", ");

  const total = numberOrUndefined(payload.total);

  return {
    rawText: rawText || "",
    source: "ai",
    amount: total,
    date: payload.date ? toIsoDateFromAi(payload.date) : undefined,
    merchant: payload.merchant?.trim() || undefined,
    note: note || undefined,
    items,
    candidateAmounts: total ? [total] : [],
    candidateMerchants: payload.merchant ? [payload.merchant.trim()] : [],
    confidence: {
      merchant: payload.confidence?.merchant,
      date: payload.confidence?.date,
      amount: payload.confidence?.total,
      items: payload.confidence?.items,
    },
  };
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toIsoDateFromAi(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

// -------------------------------------------------------------
// Robust Amount Extraction with Priority & Candidate Lists
// -------------------------------------------------------------

function extractAmounts(lines: string[]): { amount?: number; candidateAmounts: number[] } {
  const priorityPatterns = [
    { regex: /grand\s*total/i, weight: 1 },
    { regex: /net\s*(?:payable|amount|total)|total\s*payable|amount\s*payable/i, weight: 2 },
    { regex: /bill\s*total|total\s*bill|total\s*amount/i, weight: 3 },
    { regex: /(?:total|amount)\s*(?:tk|bdt|৳)/i, weight: 4 },
    { regex: /(?:tk|bdt|৳)\s*(?:total|amount)/i, weight: 4 },
    { regex: /\btotal\s*[:=]/i, weight: 5 },
    { regex: /\btotal\b/i, weight: 6 },
    { regex: /\bnet\b|\bpayable\b/i, weight: 7 },
    { regex: /sub\s*total|subtotal/i, weight: 8 },
    { regex: /\bpaid\b|\bcash\b|\bcard\b/i, weight: 9 },
  ];

  const matched: Array<{ value: number; weight: number }> = [];
  const candidateSet = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isIgnoredAmountLine(line)) continue;

    const values = moneyValuesFromLine(line);
    for (const v of values) {
      if (isValidReceiptAmount(v)) {
        candidateSet.add(v);
      }
    }

    // Check against priority patterns
    for (const { regex, weight } of priorityPatterns) {
      if (regex.test(line)) {
        if (values.length > 0) {
          // Choose the rightmost number on a total line (usually total is at end of line)
          matched.push({ value: values[values.length - 1], weight });
        } else if (i + 1 < lines.length) {
          // If total label is alone, check the next line
          const nextValues = moneyValuesFromLine(lines[i + 1]);
          if (nextValues.length > 0) {
            matched.push({ value: nextValues[nextValues.length - 1], weight: weight + 0.5 });
          }
        }
        break;
      }
    }
  }

  // Candidates list: sort descending, filter realistic ranges
  const candidateAmounts = Array.from(candidateSet)
    .filter((v) => v >= 1 && v < 1_000_000)
    .sort((a, b) => b - a);

  let bestAmount: number | undefined;
  if (matched.length > 0) {
    matched.sort((a, b) => a.weight - b.weight || b.value - a.value);
    bestAmount = matched[0].value;
  } else if (candidateAmounts.length > 0) {
    // If no keyword match, pick the largest candidate that is not an outlier
    bestAmount = candidateAmounts[0];
  }

  return {
    amount: bestAmount,
    candidateAmounts: candidateAmounts.slice(0, 6),
  };
}

function isValidReceiptAmount(val: number): boolean {
  if (val <= 0 || val >= 1_000_000) return false;
  // Ignore 4-digit years like 2024, 2025, 2026 if they are standalone
  if (val >= 2020 && val <= 2030 && Number.isInteger(val)) return false;
  return true;
}

function isIgnoredAmountLine(line: string): boolean {
  // Ignore lines with phone numbers, BIN, VAT reg, invoice IDs, slip numbers, times, card numbers
  return (
    /phone|tel|cell|mobile|contact|bin\b|vat\s*reg|invoice\s*no|inv\s*#|order\s*#|slip\s*#|token|auth|seq|table\s*#|batch|terminal|wifi|password|pin/i.test(
      line,
    ) ||
    /01[3-9]\d{8}/.test(line.replace(/[\s-]/g, "")) || // BD phone numbers
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(line) // Timestamps
  );
}

function moneyValuesFromLine(line: string): number[] {
  // Clean line: replace O with 0 only if surrounded by digits
  const cleaned = line.replace(/(\d)[Oo](\d)/g, "$10$2");
  // Find numbers with decimals or integers
  const matches = cleaned.match(/\b\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?\b/g) || [];
  const results: number[] = [];

  for (const m of matches) {
    // Strip commas
    const normalized = m.replace(/,/g, "");
    // Check if phone number (11 digits starting with 01)
    if (/^01[3-9]\d{8}$/.test(normalized)) continue;
    // Check if large integers without decimal (like 8-digit barcode)
    if (!normalized.includes(".") && normalized.length > 6) continue;

    const val = parseFloat(normalized);
    if (!isNaN(val) && val > 0) {
      results.push(val);
    }
  }

  return results;
}

// -------------------------------------------------------------
// Robust Merchant Extraction
// -------------------------------------------------------------

function extractMerchants(lines: string[]): {
  merchant?: string;
  candidateMerchants: string[];
} {
  const ignoredWords =
    /^(?:cash\s*memo|tax\s*invoice|retail\s*invoice|sales\s*receipt|sales\s*memo|receipt|bill|invoice|chalan|welcome|customer|copy|token|order|table|counter|guest|duplicate|original|vat|bin|tin|phone|tel|mobile|date|time)$/i;

  const candidates: string[] = [];
  const headerLines = lines.slice(0, Math.min(6, lines.length));

  for (const line of headerLines) {
    const cleaned = cleanMerchantLine(line);
    if (!cleaned) continue;

    // Must have at least 3 chars and contain alphabets
    if (cleaned.length < 3 || cleaned.length > 45 || !/[a-zA-Z]/.test(cleaned)) continue;

    // Check if whole line is an ignored title
    if (ignoredWords.test(cleaned)) continue;

    // If it contains phone numbers or addresses only, skip
    if (/^(?:address|road|dhaka|chittagong|bangladesh|phone|cell|tel|bin)/i.test(cleaned)) continue;

    if (!candidates.includes(cleaned)) {
      candidates.push(cleaned);
    }
  }

  return {
    merchant: candidates[0],
    candidateMerchants: candidates.slice(0, 4),
  };
}

function cleanMerchantLine(line: string): string {
  return line
    .replace(/[–—*=_#~|:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, "")
    .trim();
}

// -------------------------------------------------------------
// Date & Note Parsing
// -------------------------------------------------------------

function parseDate(lines: string[]): string | undefined {
  const joined = lines.join(" ");

  // 1. Textual Month: 23 Nov 2024, 23-Nov-2024, Nov 23, 2024
  const monthNameMatch = joined.match(
    /\b(\d{1,2})[\s./~-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s./~-]*(\d{2,4})\b/i,
  );
  if (monthNameMatch) {
    return toIsoDate(
      Number(monthNameMatch[3]),
      monthFromName(monthNameMatch[2]),
      Number(monthNameMatch[1]),
    );
  }

  // 2. Numeric: DD/MM/YYYY or YYYY-MM-DD
  const numericMatch =
    joined.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/) ||
    joined.match(/\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/);

  if (!numericMatch) return undefined;

  if (numericMatch[1].length === 4) {
    return toIsoDate(Number(numericMatch[1]), Number(numericMatch[2]), Number(numericMatch[3]));
  }

  return toIsoDate(Number(numericMatch[3]), Number(numericMatch[2]), Number(numericMatch[1]));
}

function toIsoDate(year: number, month: number | undefined, day: number): string | undefined {
  if (!month || isNaN(month) || isNaN(day) || isNaN(year)) return undefined;
  const fullYear = year < 100 ? 2000 + year : year;
  if (fullYear < 2010 || fullYear > 2035) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function monthFromName(month: string): number | undefined {
  const key = month.toLowerCase().slice(0, 3);
  const months: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  return months[key];
}

function parseNote(lines: string[]): string | undefined {
  const ignoredPatterns =
    /phone|mobile|bin|vat|invoice|date|time|paid|bill|receipt|gross|total|payment|cash|card|guest|thank|powered|wifi|subtotal/i;

  const validLines = lines
    .filter((l) => !ignoredPatterns.test(l) && /[a-zA-Z]{3,}/.test(l) && l.length <= 40)
    .slice(2, 5);

  return validLines.length ? validLines.join(", ") : undefined;
}

// -------------------------------------------------------------
// Image Enhancement (Smooth contrast, no harsh clipping)
// -------------------------------------------------------------

function enhanceReceiptCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Calculate average brightness
  let totalBrightness = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  const avg = totalBrightness / pixelCount;

  // If image is dark, add gentle brightness offset
  const boost = avg < 130 ? (130 - avg) * 0.45 : 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 + boost;
    // Contrast multiplier 1.35 centered around 128 (smooth, never destructive)
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }

  ctx.putImageData(imageData, 0, 0);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
