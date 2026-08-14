import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { notes } from "../../../db/schema";

async function ensureNotesTable() {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function GET() {
  await ensureNotesTable();
  const rows = await getDb().select().from(notes).orderBy(desc(notes.updatedAt), desc(notes.id));
  return Response.json({ notes: rows });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { title?: string; content?: string };
  const title = payload.title?.trim() ?? "";
  if (!title) return Response.json({ error: "请输入笔记标题" }, { status: 400 });

  await ensureNotesTable();
  const [note] = await getDb().insert(notes).values({ title, content: payload.content ?? "" }).returning();
  return Response.json({ note }, { status: 201 });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as { id?: number; title?: string; content?: string };
  const title = payload.title?.trim() ?? "";
  if (!payload.id || !title) return Response.json({ error: "笔记参数不完整" }, { status: 400 });

  await ensureNotesTable();
  const [note] = await getDb().update(notes).set({ title, content: payload.content ?? "", updatedAt: new Date().toISOString() }).where(eq(notes.id, payload.id)).returning();
  if (!note) return Response.json({ error: "笔记不存在" }, { status: 404 });
  return Response.json({ note });
}

export async function DELETE(request: Request) {
  const payload = (await request.json()) as { id?: number; all?: boolean };
  await ensureNotesTable();
  if (payload.all) {
    await getDb().delete(notes);
    return Response.json({ ok: true });
  }
  if (!payload.id) return Response.json({ error: "缺少笔记 ID" }, { status: 400 });
  await getDb().delete(notes).where(eq(notes.id, payload.id));
  return Response.json({ ok: true });
}
