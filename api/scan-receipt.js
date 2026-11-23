const RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    merchant: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "ISO date in YYYY-MM-DD format when visible." },
    total: { type: ["number", "null"] },
    payment_method: { type: ["string", "null"] },
    note: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
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

  const { imageDataUrl, ocrText, geminiApiKey, openaiApiKey } = req.body || {};
  if (!isDataImage(imageDataUrl)) {
    return res.status(400).json({ error: "A base64 receipt image is required." });
  }

  const activeGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const activeOpenaiKey = openaiApiKey || process.env.OPENAI_API_KEY;

  if (!activeGeminiKey && !activeOpenaiKey) {
    return res.status(503).json({
      error:
        "AI receipt scan is not configured. Add a free Google Gemini API key in Settings or set GEMINI_API_KEY in Vercel environment variables.",
    });
  }

  // Prefer Google Gemini 2.0 / 1.5 Flash Vision (faster, free tier, highly accurate on receipts)
  if (activeGeminiKey) {
    try {
      const base64Data = imageDataUrl.replace(/^data:image\/(?:png|jpeg|jpg|webp);base64,/, "");
      const mimeType = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || "image/jpeg";

      const prompt = [
        "You are an expense tracker receipt scanner. Read the receipt image carefully.",
        "Extract:",
        "- merchant: Store / restaurant / business name",
        "- date: Transaction date formatted strictly as YYYY-MM-DD",
        "- total: Final total amount paid (number in local currency e.g. BDT/Tk)",
        "- note: Short summary of main items purchased (e.g. 'Brownie')",
        "- payment_method: Cash, Card, Mobile Banking, or null",
        "- category: Suggested expense category e.g. Food, Transport, Shopping, Bills, etc.",
        "- items: Array of objects with: name (string), quantity (number or null), unit_price (number or null), total (number or null)",
        "- confidence: Object with merchant (0-1), date (0-1), total (0-1), items (0-1)",
        ocrText ? `Raw OCR text detected from image:\n${String(ocrText).slice(0, 3000)}` : "",
        "Return pure valid JSON conforming strictly to the requested keys.",
      ].join("\n");

      const geminiModel = process.env.GEMINI_RECEIPT_MODEL || "gemini-2.0-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${activeGeminiKey}`,
        {
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
        },
      );

      const geminiData = await response.json();
      if (!response.ok) {
        throw new Error(geminiData?.error?.message || "Gemini vision scan failed.");
      }

      const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini returned empty response.");
      }

      return res.status(200).json(validateReceipt(JSON.parse(text)));
    } catch (err) {
      if (!activeOpenaiKey) {
        return res.status(500).json({
          error: err instanceof Error ? err.message : "Gemini receipt scan failed.",
        });
      }
      // If Gemini fails but OpenAI key exists, fall through to OpenAI
    }
  }

  // Fallback to OpenAI GPT-4o-mini
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeOpenaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RECEIPT_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expense tracker receipt scanner. Read the receipt image carefully. Extract: merchant name, transaction date (YYYY-MM-DD), final total paid amount (number in BDT/local currency), note (brief summary of items purchased), items list, and confidence (0-1). Output JSON format matching the schema.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Extract merchant name, date, final paid total amount, and items from this receipt image.",
                  ocrText ? `OCR text detected from image:\n${String(ocrText).slice(0, 3000)}` : "",
                ].join("\n"),
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipt_extraction",
            strict: true,
            schema: RECEIPT_SCHEMA,
          },
        },
        temperature: 0.1,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || "AI receipt scan failed.",
      });
    }

    const text = payload.choices?.[0]?.message?.content;
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
