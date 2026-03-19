import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Makes Vite-injected CSS non-render-blocking in production builds.
 * Converts <link rel="stylesheet"> to media="print" with onload swap,
 * so the app shell can paint before the full stylesheet downloads.
 */
function deferCssPlugin(): Plugin {
  return {
    name: "defer-css",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        `<link rel="stylesheet" crossorigin href="$1" media="print" onload="this.media='all'">\n    <noscript><link rel="stylesheet" crossorigin href="$1"></noscript>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), deferCssPlugin()],
});
