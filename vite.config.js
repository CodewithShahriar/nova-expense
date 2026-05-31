import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import scanReceiptHandler from "./api/scan-receipt.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.OPENAI_API_KEY ||= env.OPENAI_API_KEY;
  process.env.OPENAI_RECEIPT_MODEL ||= env.OPENAI_RECEIPT_MODEL;

  return {
    plugins: [react(), tsconfigPaths(), tailwindcss(), localApiPlugin()],
    resolve: {
      preserveSymlinks: true,
    },
  };
});

function localApiPlugin() {
  return {
    name: "local-api-routes",
    configureServer(server) {
      server.middlewares.use("/api/scan-receipt", async (req, res) => {
        const body = await readJsonBody(req);
        const vercelReq = { ...req, body, method: req.method };
        const vercelRes = createVercelResponse(res);

        await scanReceiptHandler(vercelReq, vercelRes);
      });
    },
  };
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

function createVercelResponse(res) {
  let statusCode = 200;

  const response = {
    setHeader: (name, value) => res.setHeader(name, value),
    status: (code) => {
      statusCode = code;
      return response;
    },
    json: (value) => {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(value));
    },
  };

  return response;
}
