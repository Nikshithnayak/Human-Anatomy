import { backendStore } from "@/lib/backend-data";

export async function GET() {
  try {
    const quizzes = backendStore.getQuizzes();
    return Response.json({ quizzes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load quizzes";
    return Response.json({ error: message }, { status: 500 });
  }
}
