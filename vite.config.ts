import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages sert sous /manafamily/ : sans base, les bundles 404 → page blanche
  base: "/manafamily/",
  build: { outDir: "site" },
});
