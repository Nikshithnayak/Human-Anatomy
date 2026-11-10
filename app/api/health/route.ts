export async function GET() {
  return Response.json({
    status: "ok",
    app: "Human Atlas & Anatomy Atelier",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
}
