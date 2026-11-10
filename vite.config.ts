import vinext from "vinext";
import { defineConfig } from "vite";

// Enable polling automatically when filesystem watchers are constrained.
const useWatchPolling = process.env.FORCE_WATCH_POLLING === "true";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [],
  r2_buckets: [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      // Disable forwardConsole to prevent @vite/client ws.send errors if detached.
      forwardConsole: false,
      watch: {
        ignored: ["**/.wrangler/**", "**/dist/**", "**/.next/**", "**/external/**"],
        ...(useWatchPolling ? { useFsEvents: false, usePolling: true } : {}),
      },
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
