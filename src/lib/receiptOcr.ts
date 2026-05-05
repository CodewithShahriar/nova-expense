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
  const weighted: Array<{ value: number; score: number }> = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    const amountMatches = line.match(
      /(?:৳|tk|bdt)?\s*([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)/gi,
    );
    if (!amountMatches) return;

    amountMatches.forEach((match) => {
      const numeric = Number(match.replace(/৳|tk|bdt/gi, "").replace(/[, ]/g, ""));
      if (!Number.isFinite(numeric) || numeric <= 0) return;
      let score = numeric;
      if (/total|amount|grand|net|payable|paid|balance due/.test(lower)) score += 100000;
      if (/subtotal|change|cash|vat|tax|discount|qty|quantity/.test(lower)) score -= 50000;
      weighted.push({ value: numeric, score });
    });
  });

  return weighted.sort((a, b) => b.score - a.score)[0]?.value;
}

function parseDate(lines: string[]) {
  const joined = lines.join(" ");
  const match =
    joined.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/) ||
    joined.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);

  if (!match) return undefined;

  let day: number;
  let month: number;
  let year: number;

  if (match[1].length === 4) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
    if (year < 100) year += 2000;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function parseMerchant(lines: string[]) {
  const ignored = /receipt|invoice|cash memo|date|time|phone|mobile|vat|bin|total|amount/i;
  return lines.find((line) => line.length >= 3 && line.length <= 48 && !ignored.test(line));
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
