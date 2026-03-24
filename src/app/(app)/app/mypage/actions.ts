"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

const INTEREST_TAG_VALUES = [
  "坐禅",
  "写経",
  "ヨガ",
  "マインドフルネス",
  "仏教講座",
  "供養",
] as const;

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ログインが必要です。" };

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string | null;
  const pushEnabled = formData.get("pushEnabled") === "true";
  const selectedTags = INTEREST_TAG_VALUES.filter(
    (tag) => formData.get(`tag_${tag}`) === "on"
  );

  if (!name) return { error: "名前は必須です。" };

  await prisma.user.update({
    where: { email: user.email! },
    data: { name, phone: phone || undefined, pushEnabled },
  });

  const member = await prisma.member.findFirst({
    where: { user: { email: user.email! } },
  });

  if (member) {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        interestTags: selectedTags,
      },
    });
  }

  revalidatePath("/app/mypage");
  return { success: true };
}
