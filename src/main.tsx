import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Remove the static app shell overlay now that React has painted.
// In production, CSS is deferred (media="print" until loaded). Wait for it
// before removing the shell so the swap is seamless and CLS stays at zero.
const shell = document.getElementById("app-shell");
if (shell) {
  const cssReady = () =>
    !document.querySelector(
      'link[rel="stylesheet"][media="print"][href^="/assets/"]',
    );

  if (cssReady()) {
    shell.remove();
  } else {
    const poll = () => {
      if (cssReady()) shell.remove();
      else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }
}
