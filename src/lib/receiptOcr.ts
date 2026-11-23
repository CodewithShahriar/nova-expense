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
  maxWidth = 2200,
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

  return {
    preview,
    scan: canvas.toDataURL("image/jpeg", 0.95),
  };
}

export async function resizeReceiptImage(file: File, maxWidth = 2200): Promise<string> {
  return prepareReceiptImages(file, maxWidth).then((images) => images.scan);
}

export async function scanReceiptImage(imageDataUrl: string): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    // Default page segmentation (PSM 3) handles receipt columns and totals best
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
  const date = parseDate(rawText);
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
// Accurate Amount & Total Extraction
// -------------------------------------------------------------

function extractAmounts(lines: string[]): { amount?: number; candidateAmounts: number[] } {
  const priorityPatterns = [
    { regex: /grand\s*total/i, weight: 1 },
    { regex: /ticket\s*total/i, weight: 1.2 },
    { regex: /total\s*payment/i, weight: 1.5 },
    { regex: /net\s*(?:total|payable|amount)|total\s*payable|amount\s*payable/i, weight: 2 },
    { regex: /gross\s*total/i, weight: 2.1 },
    { regex: /bill\s*total|total\s*bill|total\s*amount/i, weight: 2.5 },
    { regex: /(?:total|amount)\s*(?:tk|bdt|৳)/i, weight: 3 },
    { regex: /(?:tk|bdt|৳)\s*(?:total|amount)/i, weight: 3 },
    { regex: /\btotal\s*[:=]/i, weight: 4 },
    { regex: /\btotal\b/i, weight: 5 },
    { regex: /\bnet\b|\bpayable\b/i, weight: 6 },
    { regex: /sub\s*total|subtotal/i, weight: 7 },
    { regex: /\bpaid\b|\bcash\b|\bcard\b/i, weight: 8 },
  ];

  const matched: Array<{ value: number; weight: number; line: string }> = [];
  const candidateSet = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isIgnoredAmountLine(line)) continue;

    const values = moneyValuesFromLine(line);
    for (const v of values) {
      if (isValidReceiptAmount(v, line)) {
        candidateSet.add(v);
      }
    }

    for (const { regex, weight } of priorityPatterns) {
      if (regex.test(line)) {
        if (values.length > 0) {
          const valid = values.filter((v) => isValidReceiptAmount(v, line));
          if (valid.length > 0) {
            matched.push({ value: valid[valid.length - 1], weight, line });
          }
        } else if (i + 1 < lines.length) {
          const nextValues = moneyValuesFromLine(lines[i + 1]).filter((v) =>
            isValidReceiptAmount(v, lines[i + 1]),
          );
          if (nextValues.length > 0) {
            matched.push({
              value: nextValues[nextValues.length - 1],
              weight: weight + 0.5,
              line: lines[i + 1],
            });
          }
        }
        break;
      }
    }
  }

  const candidateAmounts = Array.from(candidateSet)
    .filter((v) => v >= 1 && v < 1_000_000)
    .sort((a, b) => b - a);

  let bestAmount: number | undefined;
  if (matched.length > 0) {
    matched.sort((a, b) => a.weight - b.weight || b.value - a.value);
    bestAmount = matched[0].value;
  } else if (candidateAmounts.length > 0) {
    bestAmount = candidateAmounts[0];
  }

  return {
    amount: bestAmount,
    candidateAmounts: candidateAmounts.slice(0, 6),
  };
}

function isValidReceiptAmount(val: number, line: string): boolean {
  if (val <= 0 || val >= 1_000_000) return false;
  if (val >= 2020 && val <= 2030 && Number.isInteger(val)) return false;
  // Ignore street addresses e.g. "26 Shuveccha"
  if (
    /shuveccha|road|street|sector|house|flat|holding|lane|block|avenue|moholla|sylhet|dhaka/i.test(
      line,
    )
  ) {
    return false;
  }
  // Ignore Mushak / VAT form numbers e.g. "Mushak-6.3"
  if (/mushak|form|chalan|tax|tin|bin/i.test(line) && (val === 6.3 || val === 6 || val === 3)) {
    return false;
  }
  // Ignore table numbers or guest counts
  if (/table|guest|pax|token|slip/i.test(line)) {
    return false;
  }
  return true;
}

function isIgnoredAmountLine(line: string): boolean {
  return (
    /phone|tel|cell|mobile|contact|bin\b|vat\s*reg|invoice\s*no|inv\s*#|order\s*#|slip\s*#|token|auth|seq|table\s*#|batch|terminal|wifi|password|pin/i.test(
      line,
    ) ||
    /01[3-9]\d{8}/.test(line.replace(/[\s-]/g, "")) ||
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(line)
  );
}

function moneyValuesFromLine(line: string): number[] {
  const cleaned = line.replace(/(\d)[Oo](\d)/g, "$10$2");
  const matches = cleaned.match(/\b\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?\b/g) || [];
  const results: number[] = [];

  for (const m of matches) {
    const normalized = m.replace(/,/g, "");
    if (/^01[3-9]\d{8}$/.test(normalized)) continue;
    if (!normalized.includes(".") && normalized.length > 6) continue;

    const val = parseFloat(normalized);
    if (!isNaN(val) && val > 0) {
      results.push(val);
    }
  }

  return results;
}

// -------------------------------------------------------------
// Accurate Merchant & Store Name Extraction
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
    if (cleaned.length < 3 || cleaned.length > 45 || !/[a-zA-Z]/.test(cleaned)) continue;
    if (ignoredWords.test(cleaned)) continue;
    if (
      /^(?:address|road|dhaka|chittagong|sylhet|bangladesh|phone|cell|tel|bin|mushak|table)/i.test(
        cleaned,
      )
    ) {
      continue;
    }

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
    .replace(/[–—*=_#~|:;[\]"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, "")
    .trim();
}

// -------------------------------------------------------------
// Date & Item Note Extraction
// -------------------------------------------------------------

function parseDate(raw: string): string | undefined {
  // Numeric: 10/27/2026, 27/10/2026, 2026-10-27
  const numericMatch = raw.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (numericMatch) {
    const n1 = Number(numericMatch[1]);
    const n2 = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);

    let day = n1;
    let month = n2;

    if (n1 <= 12 && n2 > 12) {
      month = n1;
      day = n2;
    } else if (n1 > 12 && n2 <= 12) {
      day = n1;
      month = n2;
    }

    const fullYear = year < 100 ? 2000 + year : year;
    if (
      fullYear >= 2015 &&
      fullYear <= 2035 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const d = new Date(Date.UTC(fullYear, month - 1, day));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // Textual: 27 Oct 2026, Oct 27, 2026
  const monthNameMatch = raw.match(
    /\b(\d{1,2})[\s./~-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s./~-]*(\d{2,4})\b/i,
  );
  if (monthNameMatch) {
    const day = Number(monthNameMatch[1]);
    const monthStr = monthNameMatch[2].toLowerCase().slice(0, 3);
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
    const month = months[monthStr];
    let year = Number(monthNameMatch[3]);
    year = year < 100 ? 2000 + year : year;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return undefined;
}

function parseNote(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(
      /(?:[-~]?\d+\s+)?([A-Za-z]{3,}(?:\s+[A-Za-z]{3,})*)\s+\d+(?:\.\d{2})?/,
    );
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!/qty|item|name|price|total|ticket|paid|bill|date|table|invoice/i.test(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
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
