import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const BUCKET = "articles";
const MAX_SIZE = 10 * 1024 * 1024;

// POST /api/admin/articles/[id]/cover
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "STAFF", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "画像ファイルを選択してください" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_SIZE });

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${id}/cover.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error || !data) {
      return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    await prisma.article.update({ where: { id }, data: { coverImage: urlData.publicUrl } });

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
