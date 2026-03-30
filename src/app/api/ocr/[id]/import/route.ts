import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const { members: membersData } = body;

  const ocrRequest = await prisma.ocrRequest.findUnique({ where: { id } });
  if (!ocrRequest || ocrRequest.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!Array.isArray(membersData) || membersData.length === 0) {
    return NextResponse.json({ error: "members array is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  let importedCount = 0;
  const errors: string[] = [];

  for (const m of membersData) {
    try {
      if (!m.email || !m.name || !m.familyName) {
        errors.push(`スキップ: name/email/familyName が不足`);
        continue;
      }

      // Supabase Auth ユーザー作成
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: m.email,
        email_confirm: true,
        user_metadata: { name: m.name },
      });
      if (authError || !authData.user) {
        errors.push(`${m.email}: ${authError?.message ?? "auth error"}`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          id: authData.user.id,
          templeId: authUser.templeId,
          role: "MEMBER",
          name: m.name,
          email: m.email,
          phone: m.phone ?? null,
        },
      });

      await prisma.member.create({
        data: {
          templeId: authUser.templeId,
          userId: user.id,
          familyName: m.familyName,
          address: m.address ?? null,
          postalCode: m.postalCode ?? null,
          type: m.type ?? "DANKA",
          notes: m.notes ?? null,
        },
      });

      importedCount++;
    } catch (e) {
      errors.push(`${m.email ?? "unknown"}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  await prisma.ocrRequest.update({
    where: { id },
    data: {
      status: "COMPLETED",
      importedCount,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ importedCount, errors });
}
