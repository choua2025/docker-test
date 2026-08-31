import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Requests to /api are forwarded to the Express API. Because the
      // browser only ever talks to localhost:5173, there is no CORS to
      // configure during development.
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://localhost:9000",
          changeOrigin: true,
        },
      },
    },
  };
});
