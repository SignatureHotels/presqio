import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readApiPath, readBackendOrigin } from "./config/environment";

export default defineConfig(({ command, mode }) => {
  const envDir = fileURLToPath(new URL(".", import.meta.url));
  const env = loadEnv(mode, envDir, "");
  const apiPath = readApiPath(env.VITE_API_URL);
  const proxy = command === "serve"
    ? { [apiPath]: { target: readBackendOrigin(env.BACKEND_ORIGIN), changeOrigin: true } }
    : undefined;
  return {
    envDir,
    plugins: [react()],
    // Inject only the validated public path, never the backend origin or other environment data.
    define: { __PRESQIO_API_BASE_URL__: JSON.stringify(apiPath) },
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { proxy },
    preview: { proxy },
  };
});
