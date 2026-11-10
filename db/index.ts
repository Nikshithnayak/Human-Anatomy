import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  const bindings = env as unknown as { DB?: D1Database };
  if (!bindings.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure a D1 binding (`DB`) in Cloudflare Workers / Wrangler before using relational queries."
    );
  }

  return drizzle(bindings.DB, { schema });
}
