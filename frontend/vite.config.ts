import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, /api é encaminhado ao back-end FastAPI (porta 8000).
// No build, os arquivos vão para backend/app/static e são servidos pelo próprio FastAPI.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8000" } },
  build: { outDir: "../backend/app/static", emptyOutDir: true, chunkSizeWarningLimit: 1000 },
});
