import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";

const BUCKET = "avatars";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "画像ファイルを選択してください" }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "ファイルサイズは3MB以下にしてください" }, { status: 400 });
  }

  const supabaseAdmin = createAdminSupabaseClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ["image/*"],
    fileSizeLimit: 3 * 1024 * 1024,
  }).catch(() => {});

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError || !uploadData) {
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(uploadData.path);
  const avatarUrl = urlData.publicUrl;

  await prisma.user.update({
    where: { email: user.email! },
    data: { avatarUrl },
  });

  return NextResponse.json({ url: avatarUrl });
}
