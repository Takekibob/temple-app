"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { validatePhone, validatePostalCode, normalizePostalCode } from "@/lib/memberValidation";

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
  const address = formData.get("address") as string | null;
  const postalCode = formData.get("postalCode") as string | null;
  const pushEnabled = formData.get("pushEnabled") === "true";
  const selectedTags = INTEREST_TAG_VALUES.filter(
    (tag) => formData.get(`tag_${tag}`) === "on"
  );

  if (!name) return { error: "名前は必須です。" };
  if (phone) {
    const phoneErr = validatePhone(phone);
    if (phoneErr) return { error: phoneErr };
  }
  if (postalCode) {
    const postalErr = validatePostalCode(postalCode);
    if (postalErr) return { error: postalErr };
  }

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
        address: address || undefined,
        postalCode: postalCode ? normalizePostalCode(postalCode) : undefined,
      },
    });
  }

  revalidatePath("/app/settings");
  return { success: true };
}

export async function updatePushEnabled(enabled: boolean) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ログインが必要です。" };

  await prisma.user.update({
    where: { email: user.email! },
    data: { pushEnabled: enabled },
  });

  revalidatePath("/app/settings/notifications");
  return { success: true };
}
