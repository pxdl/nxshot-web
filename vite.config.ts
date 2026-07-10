import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Defer the Vite-bundled CSS so it no longer blocks first paint. */
function deferCss(): Plugin {
  return {
    name: "defer-css",
    enforce: "post",
    transformIndexHtml(html) {
      // `onerror` mirrors `onload`: a failed CSS request never fires onload, so
      // without this the media stays "print" forever and main.tsx's shell-removal
      // poll (which waits for media to flip) would never unblock.
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/,
        `<link rel="stylesheet" crossorigin href="$1" media="print" onload="this.media='all'" onerror="this.media='all'">\n    <noscript><link rel="stylesheet" crossorigin href="$1"></noscript>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), deferCss()],
});
