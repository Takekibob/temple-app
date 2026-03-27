import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const BUCKET = "temple-logos";

// POST /api/settings/logo
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "画像ファイルを選択してください" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは2MB以下にしてください" }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${authUser.templeId}/logo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // バケットが存在しない場合は作成
    const { error: bucketError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: 2097152,
    });
    // 既存の場合はエラーを無視
    if (bucketError && !bucketError.message.includes("already exists")) {
      return NextResponse.json({ error: "ストレージの準備に失敗しました" }, { status: 500 });
    }

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError || !uploadData) {
      return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(uploadData.path);
    const logoUrl = urlData.publicUrl;

    await prisma.temple.update({ where: { id: authUser.templeId }, data: { logoUrl } });

    return NextResponse.json({ logoUrl });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
