import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

async function fetchRoute(path = "/api/health") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "application/json" },
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

test("Anatomy Lessons API: Returns structured curriculum modules", async () => {
  const response = await fetchRoute("/api/lessons");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(Array.isArray(data.lessons), "Expected data.lessons to be an array");
  assert.ok(data.lessons.length > 0, "Expected at least 1 lesson module");
  
  const first = data.lessons[0];
  assert.ok(first.id, "Lesson must have an id");
  assert.ok(first.title, "Lesson must have a title");
  assert.ok(Array.isArray(first.sections), "Lesson must have sections");
  assert.ok(Array.isArray(first.checkpoints), "Lesson must have checkpoint questions");
});

test("Anatomy Quizzes API: Returns USMLE & Board Review Spotters", async () => {
  const response = await fetchRoute("/api/quizzes");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(Array.isArray(data.quizzes), "Expected data.quizzes to be an array");
  assert.ok(data.quizzes.length > 0, "Expected at least 1 quiz");

  const firstQuiz = data.quizzes[0];
  assert.ok(firstQuiz.id, "Quiz must have an id");
  assert.ok(Array.isArray(firstQuiz.questions), "Quiz must contain questions array");
  assert.ok(firstQuiz.questions.length > 0, "Quiz questions must not be empty");
  assert.ok(typeof firstQuiz.questions[0].correctIndex === "number", "Quiz question requires correctIndex");
});

test("Anatomy Notes & Bookmarks API: Responds cleanly to GET requests", async () => {
  const notesRes = await fetchRoute("/api/notes");
  assert.equal(notesRes.status, 200);
  const notesData = await notesRes.json();
  assert.ok(Array.isArray(notesData.notes), "Notes endpoint must return array");

  const bmRes = await fetchRoute("/api/bookmarks");
  assert.equal(bmRes.status, 200);
  const bmData = await bmRes.json();
  assert.ok(Array.isArray(bmData.bookmarks), "Bookmarks endpoint must return array");
});

test("Atlas Dataset Verification: Male & Female atlas manifests and binary chunks are valid", () => {
  const male = JSON.parse(fs.readFileSync("public/models/atlas.json", "utf8"));
  const female = JSON.parse(fs.readFileSync("public/models/atlas-female.json", "utf8"));

  assert.equal(male.sex, "male");
  assert.equal(male.chunks.length, 15, "Male atlas must have 15 binary chunks");
  assert.equal(male.parts.length, 2234, "Male atlas must have 2,234 parts");

  assert.equal(female.sex, "female");
  assert.equal(female.chunks.length, 15, "Female atlas must have 15 binary chunks");
  assert.equal(female.parts.length, 1217, "Female atlas must have 1,217 parts");

  // Verify all female chunks exist on disk and byte lengths match
  female.chunks.forEach((c, i) => {
    const file = "public" + c.url;
    assert.ok(fs.existsSync(file), `Female chunk file ${file} must exist`);
    const stats = fs.statSync(file);
    assert.equal(stats.size, c.bytes, `Chunk ${i} byte size mismatch`);
  });

  // Verify Female Reproductive system coverage
  const femaleRepro = female.parts.filter(p => p.system === "reproductive");
  assert.ok(femaleRepro.length >= 50, "Female atlas must include full reproductive and mammary structures");
  
  const partIds = new Set(female.parts.map(p => p.id));
  female.concepts.forEach(c => {
    c.elements.forEach(el => {
      assert.ok(partIds.has(el), `Concept ${c.id} contains dangling part ID ${el}`);
    });
  });
});
