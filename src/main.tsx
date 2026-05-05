import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initCloudSync } from "./lib/cloudSync";
import { registerServiceWorker } from "./lib/pwa";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

initCloudSync();
registerServiceWorker();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
