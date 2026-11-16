import { backendStore } from "@/lib/backend-data";
import type { OrganId } from "@/app/lib/anatomy-data";

export async function GET() {
  try {
    const notes = backendStore.getNotes();
    return Response.json({ notes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load notes";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      organId?: OrganId;
      structureId?: string;
      tags?: string[];
    };

    if (!body.title?.trim() || !body.content?.trim()) {
      return Response.json({ error: "Title and content are required" }, { status: 400 });
    }

    const note = backendStore.addNote(
      body.title.trim(),
      body.content.trim(),
      body.organId,
      body.structureId,
      body.tags || [],
    );

    return Response.json({ success: true, note }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create note";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      content?: string;
      tags?: string[];
    };

    if (!body.id) {
      return Response.json({ error: "Note id is required" }, { status: 400 });
    }

    const note = backendStore.updateNote(body.id, {
      title: body.title,
      content: body.content,
      tags: body.tags,
    });

    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 });
    }

    return Response.json({ success: true, note });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update note";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id parameter is required" }, { status: 400 });
    }
    const success = backendStore.deleteNote(id);
    return Response.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete note";
    return Response.json({ error: message }, { status: 500 });
  }
}
