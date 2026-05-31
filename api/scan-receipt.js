const RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    merchant: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "ISO date in YYYY-MM-DD format when visible." },
    total: { type: ["number", "null"] },
    payment_method: { type: ["string", "null"] },
    note: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit_price: { type: ["number", "null"] },
          total: { type: ["number", "null"] },
        },
        required: ["name", "quantity", "unit_price", "total"],
      },
    },
    confidence: {
      type: "object",
      additionalProperties: false,
      properties: {
        merchant: { type: "number" },
        date: { type: "number" },
        total: { type: "number" },
        items: { type: "number" },
      },
      required: ["merchant", "date", "total", "items"],
    },
  },
  required: ["merchant", "date", "total", "payment_method", "note", "items", "confidence"],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI receipt scan is not configured." });
  }

  const { imageDataUrl, ocrText } = req.body || {};
  if (!isDataImage(imageDataUrl)) {
    return res.status(400).json({ error: "A base64 receipt image is required." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RECEIPT_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You extract receipt data for an expense tracker. Read only visible receipt facts. Prefer final paid total, cash/card paid amount, and item totals over noisy OCR. If a field is unclear, return null and lower confidence. Output JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Extract merchant, date, total, payment method, item list, and a short transaction note.",
                  "Use BDT/Taka amounts as plain numbers.",
                  "If OCR text conflicts with the image, trust the image.",
                  ocrText ? `Browser OCR text for cross-check:\n${String(ocrText).slice(0, 5000)}` : "",
                ].join("\n"),
              },
              {
                type: "input_image",
                image_url: imageDataUrl,
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "receipt_scan",
            strict: true,
            schema: RECEIPT_SCHEMA,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || "AI receipt scan failed.",
      });
    }

    const text = payload.output_text || extractOutputText(payload);
    if (!text) {
      return res.status(502).json({ error: "AI receipt scan returned no structured output." });
    }

    return res.status(200).json(validateReceipt(JSON.parse(text)));
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "AI receipt scan failed.",
    });
  }
}

function isDataImage(value) {
  return typeof value === "string" && /^data:image\/(png|jpe?g|webp);base64,/i.test(value);
}

function extractOutputText(payload) {
  return payload?.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text")?.text;
}

function validateReceipt(receipt) {
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const itemSum = items.reduce(
    (sum, item) => sum + (typeof item.total === "number" ? item.total : 0),
    0,
  );
  const total = typeof receipt.total === "number" ? receipt.total : null;
  const validatedTotal =
    total && itemSum && Math.abs(total - itemSum) > Math.max(5, itemSum * 0.08)
      ? Number(itemSum.toFixed(2))
      : total;

  return {
    ...receipt,
    total: validatedTotal,
    note:
      receipt.note ||
      items
        .map((item) => item.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ") ||
      null,
  };
}
