import { prisma } from "@/lib/prisma";

/** 会員がいずれかのプランに加入中か確認する */
export async function hasActiveSubscription(
  memberId: string,
  templeId: string
): Promise<boolean> {
  const sub = await prisma.memberSubscription.findFirst({
    where: {
      memberId,
      status: "ACTIVE",
      plan: { templeId },
    },
  });
  return sub != null;
}
