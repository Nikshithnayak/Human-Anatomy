import { backendStore } from "@/lib/backend-data";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lesson = backendStore.getLessonById(id);
    if (!lesson) {
      return Response.json({ error: "Lesson not found" }, { status: 404 });
    }
    return Response.json({ lesson });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load lesson";
    return Response.json({ error: message }, { status: 500 });
  }
}
