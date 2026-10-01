import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import agents from "agents/vite";

export default defineConfig({
  plugins: [agents(), react(), cloudflare(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true
  }
});
