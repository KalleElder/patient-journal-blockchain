import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Alla anrop till /api skickas vidare till backend av Vites dev-server.
// Då slipper vi CORS och behöver inte skriva backend-URL:en i koden.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": env.VITE_API_URL || "http://localhost:3001",
      },
    },
  };
});
