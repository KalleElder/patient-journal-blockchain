import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Alla anrop till /api skickas vidare till backend av Vites dev-server.
// Då slipper vi CORS och behöver inte skriva backend-URL:en i koden.
// Socket.io (liveaktiviteten) går samma väg, ws: true tar med websockets.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_API_URL || "http://localhost:3001";
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": backend,
        "/socket.io": { target: backend, ws: true },
      },
    },
  };
});
