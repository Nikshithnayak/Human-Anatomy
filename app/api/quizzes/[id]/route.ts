import { backendStore } from "@/lib/backend-data";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quiz = backendStore.getQuizById(id);
    if (!quiz) {
      return Response.json({ error: "Quiz not found" }, { status: 404 });
    }
    return Response.json({ quiz });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load quiz";
    return Response.json({ error: message }, { status: 500 });
  }
}
