import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
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
    let removed = false;
    const removeShell = () => {
      if (removed) return;
      removed = true;
      shell.remove();
    };
    const poll = () => {
      if (removed) return;
      if (cssReady()) removeShell();
      else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
    // Hard deadline: a failed CSS request never fires onload (and the media
    // attribute stays "print"), so the poll loop would otherwise spin forever
    // and trap the user behind the splash shell. Remove it regardless after 4s.
    setTimeout(removeShell, 4000);
  }
}
