import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

// La interfaz del panel importa de «obsidian»: aquí se sustituye por src/shim/obsidian.ts
export default defineConfig(() => ({
  resolve: {
    alias: { obsidian: fileURLToPath(new URL("./src/shim/obsidian.ts", import.meta.url)) },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: { target: "es2021", chunkSizeWarningLimit: 600 },
}));
