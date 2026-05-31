export interface ReceiptOcrResult {
  rawText: string;
  amount?: number;
  date?: string;
  merchant?: string;
  note?: string;
  source?: "local" | "ai";
  confidence?: Partial<Record<"merchant" | "date" | "amount" | "items", number>>;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export async function resizeReceiptImage(file: File, maxWidth = 1800): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, width, height);
  enhanceReceiptCanvas(ctx, width, height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function scanReceiptImage(imageDataUrl: string): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789৳TkBDT.,:/#-()&' ",
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
    throw new Error("AI receipt scan endpoint is not available in this dev server.");
  }

  return normalizeAiReceipt(payload, rawText);
}

export function parseReceiptText(rawText: string): ReceiptOcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    rawText,
    source: "local",
    amount: parseAmount(lines),
    date: parseDate(lines),
    merchant: parseMerchant(lines),
    note: parseNote(lines),
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

  return {
    rawText: rawText || "",
    source: "ai",
    amount: numberOrUndefined(payload.total),
    date: payload.date ? toIsoDateFromAi(payload.date) : undefined,
    merchant: payload.merchant?.trim() || undefined,
    note: note || undefined,
    items,
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

function parseAmount(lines: string[]) {
  const priorityMatchers = [
    /\btotal\s*payment\b/i,
    /\bgross\s*total\b/i,
    /\btotal\b/i,
    /\bnet\s*total\b/i,
    /\bamount\b/i,
  ];
  const prioritized: Array<{ value: number; priority: number }> = [];
  const fallback: number[] = [];

  lines.forEach((line, index) => {
    if (isIgnoredAmountLine(line)) return;

    const values = moneyValuesFromLine(line);
    if (!values.length) return;

    const priority = priorityMatchers.findIndex((matcher) => matcher.test(line));
    if (priority >= 0) {
      prioritized.push({ value: bestTotalCandidate(values), priority });
      return;
    }

    fallback.push(...values);

    const previousLine = lines[index - 1] || "";
    const previousPriority = priorityMatchers.findIndex((matcher) => matcher.test(previousLine));
    if (previousPriority >= 0) {
      prioritized.push({ value: bestTotalCandidate(values), priority: previousPriority });
    }
  });

  if (prioritized.length) {
    const bestPriority = prioritized.sort((a, b) => a.priority - b.priority || b.value - a.value)[0]
      ?.value;
    const itemSum = parseItemTotalSum(lines);

    if (itemSum && bestPriority && Math.abs(bestPriority - itemSum) > Math.max(5, itemSum * 0.08)) {
      return itemSum;
    }

    return bestPriority;
  }

  return parseItemTotalSum(lines) || fallback.sort((a, b) => b - a)[0];
}

function parseDate(lines: string[]) {
  const joined = lines.join(" ");
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

  const numericMatch =
    joined.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/) ||
    joined.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);

  if (!numericMatch) return undefined;

  if (numericMatch[1].length === 4) {
    return toIsoDate(Number(numericMatch[1]), Number(numericMatch[2]), Number(numericMatch[3]));
  }

  return toIsoDate(Number(numericMatch[3]), Number(numericMatch[2]), Number(numericMatch[1]));
}

function parseMerchant(lines: string[]) {
  const ignored =
    /phone|mobile|bin|invoice|date|time|paid|bill|receipt|cash memo|vat|total|amount|guest|payment|returned|wifi|password|counter|thank|powered/i;

  const headerLines = lines.slice(0, Math.max(3, firstReceiptBodyIndex(lines)));
  const candidates = headerLines
    .flatMap((line) => merchantLineCandidates(line))
    .map(cleanMerchantLine)
    .filter(
      (line) =>
        line.length >= 3 &&
        line.length <= 48 &&
        /[a-z]/i.test(line) &&
        !ignored.test(line) &&
        !/\d{5,}/.test(line) &&
        !hasTooManyTinyWords(line),
    )
    .map((line) => ({ line, score: merchantScore(line) }))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.line;
}

function parseNote(lines: string[]) {
  const itemLines = itemSectionLines(lines)
    .map(cleanItemLine)
    .filter((line) => line.length >= 3 && /[a-z]{3,}/i.test(line))
    .slice(0, 3);

  return itemLines.length ? itemLines.join(", ") : undefined;
}

function isIgnoredAmountLine(line: string) {
  return /phone|mobile|bin|invoice|guest|returned|account|card|number\s*of|qty|quantity|item\s*name|price\s*t?\.?\s*price/i.test(
    line,
  );
}

function moneyValuesFromLine(line: string) {
  const hasMoneySignal = /৳|tk|bdt|total|amount|cash|payment|\d+\.\d{1,2}/i.test(line);
  if (!hasMoneySignal) return [];

  const matches = line.match(/\d+(?:[, ]?\d{3})*(?:\.\d{1,2})?/g) || [];
  return matches
    .map((match) => {
      const normalized = match.replace(/[, ]/g, "");
      if (!normalized.includes(".") && normalized.length >= 7) return undefined;
      const value = Number(normalized);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    })
    .filter((value): value is number => typeof value === "number");
}

function bestTotalCandidate(values: number[]) {
  const realisticValues = values.filter((value) => value >= 1 && value < 1_000_000);
  return Math.max(...(realisticValues.length ? realisticValues : values));
}

function parseItemTotalSum(lines: string[]) {
  const itemTotals = itemSectionLines(lines)
    .filter((line) => !isIgnoredAmountLine(line) && !isIgnoredNoteLine(line))
    .map((line) => moneyValuesFromLine(line))
    .filter((values) => values.length >= 2)
    .map((values) => values[values.length - 1])
    .filter((value) => value > 0 && value < 100_000);

  if (!itemTotals.length) return undefined;

  const sum = itemTotals.reduce((total, value) => total + value, 0);
  return Number(sum.toFixed(2));
}

function itemSectionLines(lines: string[]) {
  const start = lines.findIndex((line) => /item\s*name|qty|quantity/i.test(line));
  const end = lines.findIndex((line, index) => index > start && /gross|subtotal|total|payment/i.test(line));

  if (start >= 0) {
    return lines.slice(start + 1, end > start ? end : undefined);
  }

  return lines.filter((line) => /^-?\d+\s+/.test(cleanReceiptLine(line)));
}

function firstReceiptBodyIndex(lines: string[]) {
  const index = lines.findIndex((line) => /date|time|paid|bill|invoice|qty|item\s*name/i.test(line));
  return index > 0 ? index : 5;
}

function monthFromName(month: string) {
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

function toIsoDate(year: number, month: number | undefined, day: number) {
  if (!month) return undefined;
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date.toISOString();
}

function cleanMerchantLine(line: string) {
  return cleanReceiptLine(line)
    .replace(/[=_*~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, "")
    .replace(/^(?:[a-z]\s+){1,3}(?=[A-Z][a-z])/i, "")
    .trim();
}

function cleanReceiptLine(line: string) {
  return line
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function merchantLineCandidates(line: string) {
  const spacedSegments = line
    .split(/\s{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return spacedSegments.length > 1 ? spacedSegments : [line];
}

function merchantScore(line: string) {
  const words = line.split(/\s+/).filter(Boolean);
  const titleWords = words.filter((word) => /^[A-Z][a-z]+$/.test(word)).length;
  const tinyWords = words.filter((word) => word.length <= 2).length;

  return (
    titleWords * 12 +
    (words.length >= 2 && words.length <= 4 ? 18 : 0) +
    (/[,&:#]/.test(line) ? -8 : 0) +
    tinyWords * -10 +
    Math.max(0, 24 - line.length)
  );
}

function hasTooManyTinyWords(line: string) {
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 4 && words.filter((word) => word.length <= 2).length >= 3;
}

function cleanItemLine(line: string) {
  const cleaned = cleanReceiptLine(line);
  if (isIgnoredNoteLine(cleaned) || isIgnoredAmountLine(cleaned)) return "";

  const quantityMatch = cleaned.match(/-?\d+\s+[A-Za-z(][A-Za-z0-9\s()&'/-]*/);
  if (!quantityMatch) return "";

  return quantityMatch[0]
    .replace(/^-?\d+\s+/, "")
    .replace(/\b\d+(?:\.\d{1,2})?\b.*$/g, "")
    .replace(/\b(?:ea|ee|a|cw)\b$/i, "")
    .replace(/\bi50ml\b/i, "150ml")
    .replace(/\s+/g, " ")
    .replace(/^[^\w(]+|[^\w)]+$/g, "")
    .trim();
}

function isIgnoredNoteLine(line: string) {
  return /phone|mobile|bin|invoice|date|time|paid|bill|receipt|vat|gross|total|payment|cash|returned|guest|thank|powered|wifi|password|counter/i.test(
    line,
  );
}

function enhanceReceiptCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.45 + 142));
    const sharpened = contrasted > 184 ? 255 : contrasted < 92 ? 0 : contrasted;

    data[index] = sharpened;
    data[index + 1] = sharpened;
    data[index + 2] = sharpened;
  }

  ctx.putImageData(imageData, 0, 0);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
