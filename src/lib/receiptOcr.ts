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
  candidateNotes?: string[];
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
  customApiKey?: string,
): Promise<ReceiptOcrResult> {
  const geminiKey =
    customApiKey ||
    (typeof window !== "undefined" ? localStorage.getItem("nova_gemini_api_key") : null);

  // If client-side Gemini key is present, we can call Google Generative Language API directly
  if (geminiKey) {
    try {
      return await scanWithDirectGemini(imageDataUrl, geminiKey, rawText);
    } catch (err) {
      console.warn("Direct Gemini scan failed, falling back to server endpoint:", err);
    }
  }

  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageDataUrl,
      ocrText: rawText,
      geminiApiKey: geminiKey || undefined,
    }),
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

async function scanWithDirectGemini(
  imageDataUrl: string,
  apiKey: string,
  rawText?: string,
): Promise<ReceiptOcrResult> {
  const base64Data = imageDataUrl.replace(/^data:image\/(?:png|jpeg|jpg|webp);base64,/, "");
  const mimeType = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || "image/jpeg";

  const prompt = [
    "You are an expense tracker receipt scanner. Read the receipt image carefully.",
    "Extract:",
    "- merchant: Business / shop / restaurant name (e.g. 'CUP STORY')",
    "- date: Transaction date in YYYY-MM-DD format (if visible)",
    "- total: Final total amount paid (number in local currency e.g. BDT/Tk)",
    "- items: List of items purchased with name, quantity, unit_price, total. For name, provide the clean item/dish name (e.g. 'Brownie'), removing quantity symbols or hyphens.",
    "- note: Short summary of main items purchased (e.g. 'Brownie'). CRITICAL: Never use receipt footer greetings like 'THANK YOU, COME AGAIN' or POS notes.",
    "- confidence: Object with merchant, date, total, items (numbers 0 to 1)",
    "Respond in valid JSON only with keys: merchant, date, total, note, items, confidence.",
    rawText ? `Raw OCR hint:\n${rawText.slice(0, 2000)}` : "",
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
      },
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "Google Gemini AI scan failed.");
  }

  const rawJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error("Gemini returned empty structured response.");
  }

  const parsed = JSON.parse(rawJson);
  return normalizeAiReceipt(parsed, rawText);
}

export function parseReceiptText(rawText: string): ReceiptOcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const { amount, candidateAmounts } = extractAmounts(lines);
  const { merchant, candidateMerchants } = extractMerchants(lines);
  const date = parseDate(rawText);
  const { note, candidateNotes } = extractItemsAndNote(lines);

  return {
    rawText,
    source: "local",
    amount,
    date,
    merchant,
    note,
    candidateAmounts,
    candidateMerchants,
    candidateNotes,
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
      name: cleanItemName(item.name!),
      quantity: numberOrUndefined(item.quantity),
      unitPrice: numberOrUndefined(item.unit_price),
      total: numberOrUndefined(item.total),
    }))
    .filter((item) => !isInvalidExpenseNote(item.name));

  const candidateNotes: string[] = [];
  for (const it of items) {
    if (it.name && !candidateNotes.includes(it.name)) {
      candidateNotes.push(it.name);
    }
  }

  // Determine note:
  // 1. Items purchased is always the preferred note for an expense
  let bestNote: string | undefined;
  if (candidateNotes.length > 0) {
    bestNote = candidateNotes.slice(0, 3).join(", ");
  } else if (payload.note && !isInvalidExpenseNote(payload.note)) {
    bestNote = cleanItemName(payload.note);
  }

  const total = numberOrUndefined(payload.total);

  return {
    rawText: rawText || "",
    source: "ai",
    amount: total,
    date: payload.date ? toIsoDateFromAi(payload.date) : undefined,
    merchant: payload.merchant?.trim() || undefined,
    note: bestNote,
    items,
    candidateAmounts: total ? [total] : [],
    candidateMerchants: payload.merchant ? [payload.merchant.trim()] : [],
    candidateNotes,
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
    { regex: /ticket\s*tota[l|1]/i, weight: 1 },
    { regex: /tota[l|1]\s*payment/i, weight: 1.1 },
    { regex: /grand\s*tota[l|1]/i, weight: 1.2 },
    {
      regex: /net\s*(?:tota[l|1]|payable|amount)|tota[l|1]\s*payable|amount\s*payable/i,
      weight: 1.3,
    },
    { regex: /gross\s*tota[l|1]/i, weight: 1.4 },
    { regex: /bi[l|1][l|1]\s*tota[l|1]|tota[l|1]\s*bi[l|1][l|1]|tota[l|1]\s*amount/i, weight: 1.5 },
    { regex: /(?:tota[l|1]|amount)\s*(?:tk|bdt|৳)/i, weight: 2 },
    { regex: /(?:tk|bdt|৳)\s*(?:tota[l|1]|amount)/i, weight: 2 },
    { regex: /\btota[l|1]\s*[:=]/i, weight: 3 },
    { regex: /\btota[l|1]\b/i, weight: 4 },
    { regex: /\bnet\b|\bpayable\b/i, weight: 5 },
    { regex: /sub\s*tota[l|1]|subtota[l|1]/i, weight: 6 },
    { regex: /\bpaid\b|\bcash\b|\bcard\b/i, weight: 7 },
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
        } else if (i + 1 < lines.length && !isIgnoredAmountLine(lines[i + 1])) {
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

  const maxCandidate = candidateAmounts.length > 0 ? candidateAmounts[0] : 0;

  // Filter matched: a receipt total cannot be small (like 8 from a timestamp) if realistic candidates (like 220) exist
  const realisticMatches = matched.filter((m) => {
    if (m.value <= 0) return false;
    if (maxCandidate >= 50 && m.value < 10) return false;
    if (maxCandidate >= 50 && m.value < maxCandidate * 0.25) return false;
    return true;
  });

  realisticMatches.sort((a, b) => a.weight - b.weight || b.value - a.value);

  let bestAmount: number | undefined = realisticMatches[0]?.value;
  if (!bestAmount && candidateAmounts.length > 0) {
    bestAmount = candidateAmounts[0];
  }

  return {
    amount: bestAmount,
    candidateAmounts: candidateAmounts.slice(0, 6),
  };
}

function isValidReceiptAmount(val: number, line: string): boolean {
  if (val <= 0 || val >= 1_000_000) return false;
  if (val >= 2020 && val <= 2035 && Number.isInteger(val)) return false;

  // Standalone single digits (< 10) without currency symbol are almost always noise (guest count, table, hour, etc.)
  if (
    val < 10 &&
    Number.isInteger(val) &&
    !/(?:tk|bdt|৳|\$)\s*\d|\d\s*(?:tk|bdt|৳|\$)/i.test(line)
  ) {
    return false;
  }

  // Ignore street addresses e.g. "26 Shuveccha"
  if (
    /shuveccha|ambarkhana|road|street|sector|house|flat|holding|lane|block|avenue|moholla|sylhet|dhaka|chittagong/i.test(
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
    /shuveccha|ambarkhana|road|street|lane|avenue|house|holding|flat|sylhet|dhaka|chittagong/i.test(
      line,
    )
  );
}

function moneyValuesFromLine(line: string): number[] {
  // Strip timestamps and dates before extracting numbers so e.g. "Time:8:02 PM" or "10/27/2026" never yield money
  let cleaned = line.replace(
    /\b(?:time|at)\s*[:=]?\s*\d{1,2}[:.\s]\d{2}(?::\d{2})?(?:\s*[ap]m)?/gi,
    " ",
  );
  cleaned = cleaned.replace(/\b\d{1,2}[:.]\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, " ");
  cleaned = cleaned.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ");
  cleaned = cleaned.replace(/\b01[3-9]\d{8}\b/g, " ");
  cleaned = cleaned.replace(/mushak\s*[-:]?\s*6\.3/gi, " ");
  cleaned = cleaned.replace(/(\d)[Oo](\d)/g, "$10$2");

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
  let cleaned = line
    .replace(/[–—*=_#~|:;[\]"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip trailing quotes, stray numbers, or punctuation (e.g. 'CUP STORY "3' -> 'CUP STORY')
  cleaned = cleaned.replace(/[\s"'“”'`~!@#$%^&*()_+=\-[\]{}|\\:;<>?,./0-9]+$/, "").trim();
  cleaned = cleaned.replace(/^[^\w]+/, "").trim();
  return cleaned;
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

export function cleanItemName(name: string): string {
  if (!name) return "";
  let cleaned = name.trim();
  // Strip leading symbols and quantities like -1, ~1, 1x, 1-
  cleaned = cleaned.replace(/^[-~*#\s]*\d+[\s*xX-]*\s*/, "");
  // Strip trailing numbers, prices, or symbols
  cleaned = cleaned.replace(/[\s\d.,\-+=/]+$/, "");
  return cleaned.trim();
}

export function isInvalidExpenseNote(text?: string | null): boolean {
  if (!text || typeof text !== "string") return true;
  const t = text.trim();
  if (t.length < 2) return true;
  const invalid =
    /^(?:thank\s*you|come\s*again|thank\s*you[,\s]*come\s*again|visit\s*again|welcome|have\s*a\s*nice\s*day|paid\s*bill|cash\s*memo|receipt|bill|invoice|chalan|applied|bin|mushak|vat|tax|tin|table.*|guest.*|customer.*|copy|notes?|powered\s*by.*|automatic|otomatic|subveccha|ambarkhana|sylhet|dhaka)$/i;
  return invalid.test(t);
}

function extractItemsAndNote(lines: string[]): {
  note?: string;
  candidateNotes: string[];
} {
  const candidates: string[] = [];
  const invalidKeywords =
    /qty|item|name|price|total|ticket|paid|bill|date|time|table|invoice|applied|bin|mushak|vat|tax|tin|phone|tel|guest|payment|cash|card|change|returned|amount|thank|welcome|powered|otomatic|subveccha|ambarkhana|sylhet|dhaka|notes?/i;

  let inItemSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect item table start e.g. "Qty Item Name Price"
    if (/qty|item\s*name|description|particulars/i.test(line)) {
      inItemSection = true;
      continue;
    }

    // Detect total section (end of items)
    if (/ticket\s*total|net\s*total|gross\s*total|total|subtotal|payment/i.test(line)) {
      inItemSection = false;
    }

    // Match item line with name and price
    // e.g. "-1 Brownie 220.00 220.00-" or "1 Brownie 220" or "Brownie 220.00"
    const match = line.match(
      /(?:[-~#*]?\d+\s*(?:x\s*)?)?([A-Za-z\s]{3,30}?)(?:\s+\d{1,6}(?:\.\d{1,2})?)+/,
    );
    if (match && match[1]) {
      const candidate = cleanItemName(match[1]);
      if (
        candidate.length >= 2 &&
        !invalidKeywords.test(candidate) &&
        !isInvalidExpenseNote(candidate)
      ) {
        if (!candidates.includes(candidate)) candidates.push(candidate);
      }
    } else if (inItemSection) {
      // In item section even without price on same line
      const candidate = cleanItemName(line);
      if (
        candidate.length >= 2 &&
        !invalidKeywords.test(candidate) &&
        !isInvalidExpenseNote(candidate)
      ) {
        if (!candidates.includes(candidate)) candidates.push(candidate);
      }
    }
  }

  return {
    note: candidates[0] || undefined,
    candidateNotes: candidates,
  };
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
