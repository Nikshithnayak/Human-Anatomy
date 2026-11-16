import { backendStore } from "@/lib/backend-data";

export async function GET() {
  try {
    const lessons = backendStore.getLessons();
    return Response.json({ lessons });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load lessons";
    return Response.json({ error: message }, { status: 500 });
  }
}
