import assert from "node:assert/strict";
import test from "node:test";

async function fetchRoute(path = "/en") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html,application/json" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Anatomy Atelier homepage for localized route (/en)", async () => {
  const response = await fetchRoute("/en");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Anatomy Atelier/i);
});

test("redirects bare root (/) to default localized route (/en)", async () => {
  const response = await fetchRoute("/");
  assert.ok(response.status === 307 || response.status === 308);
  assert.ok(response.headers.get("location")?.includes("/en"));
});

test("returns healthy status on /api/health", async () => {
  const response = await fetchRoute("/api/health");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "ok");
});
