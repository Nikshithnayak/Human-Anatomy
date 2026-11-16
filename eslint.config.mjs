import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vinext/**",
    ".wrangler/**",
    "dist/**",
    "out/**",
    "build/**",
    "scripts/**",
    "tests/**",
    "external/**",
    "next-env.d.ts",
    // Vendored, minified third-party decoders (Draco / Basis) — not our code.
    "public/**",
    // Local agent worktrees / tool caches contain duplicate copies of the app.
    ".kilo/**",
    ".kilocode/**",
    ".openai/**",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
