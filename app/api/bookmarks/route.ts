import { backendStore } from "@/lib/backend-data";

export async function GET() {
  try {
    const bookmarks = backendStore.getBookmarks();
    return Response.json({ bookmarks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load bookmarks";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      targetId?: string;
      targetType?: "organ" | "structure";
      name?: string;
      system?: string;
    };

    if (!body.targetId || !body.name) {
      return Response.json({ error: "targetId and name are required" }, { status: 400 });
    }

    const result = backendStore.toggleBookmark(
      body.targetId,
      body.targetType || "structure",
      body.name,
      body.system,
    );

    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle bookmark";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || url.searchParams.get("targetId");
    if (!id) {
      return Response.json({ error: "id or targetId parameter is required" }, { status: 400 });
    }
    const success = backendStore.deleteBookmark(id);
    return Response.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete bookmark";
    return Response.json({ error: message }, { status: 500 });
  }
}
