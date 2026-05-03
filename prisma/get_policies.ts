import { prisma } from "../src/lib/prisma";

async function main() {
  const policies = await prisma.$queryRaw<Array<{tablename: string, policyname: string, cmd: string, qual: string, with_check: string}>>`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('events', 'announcements', 'members', 'temples', 'users')
    ORDER BY tablename, policyname
  `;
  console.log(JSON.stringify(policies, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
