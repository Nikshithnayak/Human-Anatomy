import { backendStore } from "@/lib/backend-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      quizId?: string;
      answers?: Record<string, number>;
    };

    if (!body.quizId || !body.answers) {
      return Response.json({ error: "quizId and answers are required" }, { status: 400 });
    }

    const quiz = backendStore.getQuizById(body.quizId);
    if (!quiz) {
      return Response.json({ error: "Quiz not found" }, { status: 404 });
    }

    let correctCount = 0;
    const review = quiz.questions.map((q) => {
      const selectedIndex = body.answers?.[q.id] ?? -1;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        question: q.question,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const total = quiz.questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    const stats = backendStore.recordQuizScore(body.quizId, percentage);

    return Response.json({
      quizId: body.quizId,
      score: percentage,
      correctCount,
      total,
      review,
      highScore: stats.highScore,
      attempts: stats.attempts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to grade quiz";
    return Response.json({ error: message }, { status: 500 });
  }
}
