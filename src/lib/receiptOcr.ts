export interface ReceiptOcrResult {
  rawText: string;
  amount?: number;
  date?: string;
  merchant?: string;
}

export async function resizeReceiptImage(file: File, maxWidth = 1200): Promise<string> {
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
  return canvas.toDataURL("image/jpeg", 0.78);
}

export async function scanReceiptImage(imageDataUrl: string): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(imageDataUrl);
    return parseReceiptText(text);
  } finally {
    await worker.terminate();
  }
}

export function parseReceiptText(rawText: string): ReceiptOcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    rawText,
    amount: parseAmount(lines),
    date: parseDate(lines),
    merchant: parseMerchant(lines),
  };
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

  lines.forEach((line) => {
    if (isIgnoredAmountLine(line)) return;

    const values = moneyValuesFromLine(line);
    if (!values.length) return;

    const priority = priorityMatchers.findIndex((matcher) => matcher.test(line));
    if (priority >= 0) {
      prioritized.push({ value: Math.max(...values), priority });
      return;
    }

    fallback.push(...values);
  });

  if (prioritized.length) {
    return prioritized.sort((a, b) => a.priority - b.priority || b.value - a.value)[0]?.value;
  }

  return fallback.sort((a, b) => b - a)[0];
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
    /phone|mobile|bin|invoice|date|time|paid|bill|receipt|cash memo|vat|total|amount|guest|payment|returned/i;

  return lines
    .map(cleanMerchantLine)
    .find(
      (line) =>
        line.length >= 3 &&
        line.length <= 48 &&
        /[a-z]/i.test(line) &&
        !ignored.test(line) &&
        !/\d{5,}/.test(line),
    );
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
  return line
    .replace(/[=_*~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\w]+|[^\w]+$/g, "");
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
