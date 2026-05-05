import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const BUCKET = "temple-posts";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/admin/posts/photos — 写真アップロード(URL のみ返す)
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "jpg/png/webp の画像のみアップロードできます" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    // バケット作成(既存なら無視)
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: MAX_SIZE,
    });

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${authUser.templeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error || !data) {
      return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
