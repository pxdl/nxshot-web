import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// Eagerly warm the capture IDs cache so it's ready when the user scans a folder
import { loadCaptureIds } from "./utils/captureIds";
loadCaptureIds().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
