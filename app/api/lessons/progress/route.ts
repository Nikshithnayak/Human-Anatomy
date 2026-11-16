import { backendStore } from "@/lib/backend-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lessonId?: string };
    if (!body.lessonId) {
      return Response.json({ error: "lessonId is required" }, { status: 400 });
    }
    const isCompleted = backendStore.toggleLessonComplete(body.lessonId);
    return Response.json({ success: true, lessonId: body.lessonId, isCompleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update progress";
    return Response.json({ error: message }, { status: 500 });
  }
}
