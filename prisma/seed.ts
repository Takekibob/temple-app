/**
 * てらログ パイロット寺院 初期データ
 *
 * 使い方:
 *   npm run db:seed
 *
 * 注意:
 *   管理者・会員ユーザーはSeedの前に Supabase Auth でアカウントを作成し、
 *   同じメールアドレスを下記の PILOT_* 定数に設定してください。
 *   (Supabase Auth > Authentication > Users > "Add user" または Admin API)
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  Role,
  MemberType,
  EventCategory,
  EventStatus,
  EventVisibility,
  AnnouncementTarget,
} from "../src/generated/prisma/enums";

// ============================================================
// パイロット用メールアドレス（Supabase Auth に同メールで登録すること）
// ============================================================
const PILOT_ADMIN_EMAIL = process.env.PILOT_ADMIN_EMAIL ?? "admin@enshoji-pilot.example";
const PILOT_DANKA_EMAIL = process.env.PILOT_DANKA_EMAIL ?? "yamada@enshoji-pilot.example";
const PILOT_GOEN_EMAIL = process.env.PILOT_GOEN_EMAIL ?? "suzuki@enshoji-pilot.example";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding pilot data...");

  // ----------------------------------------------------------
  // 1. 寺院
  // ----------------------------------------------------------
  const temple = await prisma.temple.upsert({
    where: { id: "pilot-temple-001" },
    update: {},
    create: {
      id: "pilot-temple-001",
      name: "円照寺",
      denomination: "曹洞宗",
      address: "長野県長野市大字長野元善町491",
      phone: "026-000-0000",
      email: "info@enshoji-pilot.example",
    },
  });
  console.log(`  ✅ Temple: ${temple.name} (${temple.id})`);

  // ----------------------------------------------------------
  // 2. 管理者ユーザー
  // ----------------------------------------------------------
  const adminUser = await prisma.user.upsert({
    where: { email: PILOT_ADMIN_EMAIL },
    update: { role: Role.ADMIN },
    create: {
      id: "pilot-admin-user-001",
      templeId: temple.id,
      role: Role.ADMIN,
      name: "田中 住職",
      email: PILOT_ADMIN_EMAIL,
    },
  });
  console.log(`  ✅ Admin user: ${adminUser.name} <${adminUser.email}>`);

  // ----------------------------------------------------------
  // 3. 檀家ユーザー + 会員
  // ----------------------------------------------------------
  const dankaUser = await prisma.user.upsert({
    where: { email: PILOT_DANKA_EMAIL },
    update: {},
    create: {
      id: "pilot-danka-user-001",
      templeId: temple.id,
      role: Role.MEMBER,
      name: "山田 太郎",
      email: PILOT_DANKA_EMAIL,
      phone: "090-0001-0001",
    },
  });

  await prisma.member.upsert({
    where: { userId: dankaUser.id },
    update: {},
    create: {
      id: "pilot-danka-member-001",
      templeId: temple.id,
      userId: dankaUser.id,
      type: MemberType.DANKA,
      familyName: "山田家",
      address: "長野県長野市大字長野1-1-1",
      phone: "090-0001-0001",
      email: PILOT_DANKA_EMAIL,
      engagementScore: 45,
    },
  });
  console.log(`  ✅ Danka member: ${dankaUser.name} <${dankaUser.email}>`);

  // ----------------------------------------------------------
  // 4. ご縁さんユーザー + 会員
  // ----------------------------------------------------------
  const goenUser = await prisma.user.upsert({
    where: { email: PILOT_GOEN_EMAIL },
    update: {},
    create: {
      id: "pilot-goen-user-001",
      templeId: temple.id,
      role: Role.MEMBER,
      name: "鈴木 花子",
      email: PILOT_GOEN_EMAIL,
      phone: "090-0002-0002",
    },
  });

  await prisma.member.upsert({
    where: { userId: goenUser.id },
    update: {},
    create: {
      id: "pilot-goen-member-001",
      templeId: temple.id,
      userId: goenUser.id,
      type: MemberType.GOEN,
      familyName: "鈴木",
      email: PILOT_GOEN_EMAIL,
      phone: "090-0002-0002",
      engagementScore: 28,
      referralSource: "SNS",
    },
  });
  console.log(`  ✅ Goen member: ${goenUser.name} <${goenUser.email}>`);

  // ----------------------------------------------------------
  // 5. テスト用イベント 3件
  // ----------------------------------------------------------
  const events = [
    {
      id: "pilot-event-zazen-001",
      templeId: temple.id,
      title: "はじめての坐禅体験会",
      description:
        "初心者の方でも気軽に参加できる坐禅体験会です。禅の基礎や座り方を丁寧にご指導いたします。終了後は住職との茶話会もございます。",
      category: EventCategory.ZAZEN,
      eventDate: new Date("2026-04-19T00:00:00Z"),
      startTime: "10:00",
      endTime: "12:00",
      location: "本堂",
      capacity: 20,
      fee: 1000,
      visibility: EventVisibility.PUBLIC,
      status: EventStatus.PUBLISHED,
    },
    {
      id: "pilot-event-shakyo-001",
      templeId: temple.id,
      title: "写経体験 ～心を静める時間～",
      description:
        "般若心経の写経体験です。筆ペンを使って丁寧に文字を書くことで、日常の喧騒を忘れ、心を静める時間をお過ごしいただけます。道具はすべてご用意しております。",
      category: EventCategory.SHAKYO,
      eventDate: new Date("2026-05-03T00:00:00Z"),
      startTime: "14:00",
      endTime: "16:00",
      location: "客殿",
      capacity: 15,
      fee: 800,
      visibility: EventVisibility.PUBLIC,
      status: EventStatus.PUBLISHED,
    },
    {
      id: "pilot-event-seasonal-001",
      templeId: temple.id,
      title: "花まつり（仏誕会）",
      description:
        "4月8日はお釈迦様のお誕生日。お花で飾った花御堂に甘茶をかけてお祝いします。子どもから大人まで楽しめる春の恒例行事です。甘茶のふるまいもございます。",
      category: EventCategory.SEASONAL,
      eventDate: new Date("2026-04-08T00:00:00Z"),
      startTime: "10:00",
      endTime: "15:00",
      location: "境内",
      capacity: null,
      fee: 0,
      visibility: EventVisibility.PUBLIC,
      status: EventStatus.PUBLISHED,
    },
  ] as const;

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: {},
      create: event,
    });
    console.log(`  ✅ Event: ${event.title}`);
  }

  // ----------------------------------------------------------
  // 6. テスト用お知らせ 2件
  // ----------------------------------------------------------
  const announcements = [
    {
      id: "pilot-announcement-all-001",
      templeId: temple.id,
      title: "てらログをご利用いただきありがとうございます",
      body: `円照寺のデジタルアプリ「てらログ」にようこそ。

このアプリでは以下のことができます：
・イベント・行事への参加申込
・法要予約（檀家の方）
・お寺からのお知らせ受信
・マイページでのプロフィール管理

ご不明な点はお気軽にお問い合わせください。
合掌`,
      targetSegment: AnnouncementTarget.ALL,
      publishedAt: new Date(),
    },
    {
      id: "pilot-announcement-danka-001",
      templeId: temple.id,
      title: "【檀家の方へ】令和8年度 護持会費のご案内",
      body: `檀家の皆様へ

令和8年度の護持会費の納入時期となりました。
例年通り3月末日までにお納めいただきますようお願い申し上げます。

・年額：10,000円
・納入方法：窓口にて現金またはお振込み
・振込先：〇〇銀行 〇〇支店 普通 1234567 エンショウジ

ご不明な点はお寺までご連絡ください。
電話：026-000-0000（受付時間 9:00〜17:00）

合掌`,
      targetSegment: AnnouncementTarget.DANKA,
      publishedAt: new Date(),
    },
  ] as const;

  for (const announcement of announcements) {
    await prisma.announcement.upsert({
      where: { id: announcement.id },
      update: {},
      create: announcement,
    });
    console.log(`  ✅ Announcement: ${announcement.title}`);
  }

  // ----------------------------------------------------------
  // 7. 年中行事（参考データ）
  // ----------------------------------------------------------
  const annualEvents = [
    { id: "annual-newyear", templeId: temple.id, name: "元旦会・修正会", month: 1, day: 1 },
    { id: "annual-setsubun", templeId: temple.id, name: "節分会", month: 2, day: 3 },
    { id: "annual-hanamatsuri", templeId: temple.id, name: "花まつり（仏誕会）", month: 4, day: 8 },
    { id: "annual-obon-mukaebe", templeId: temple.id, name: "お盆（迎え火）", month: 8, day: 13 },
    { id: "annual-obon-okuribo", templeId: temple.id, name: "お盆（送り火）", month: 8, day: 16 },
    { id: "annual-higan-aki", templeId: temple.id, name: "秋彼岸法要", month: 9, day: 23 },
    { id: "annual-joya", templeId: temple.id, name: "除夜の鐘", month: 12, day: 31 },
  ];

  for (const ae of annualEvents) {
    await prisma.annualEvent.upsert({
      where: { id: ae.id },
      update: {},
      create: ae,
    });
  }
  console.log(`  ✅ Annual events: ${annualEvents.length} records`);

  console.log("\n✨ Seed complete!");
  console.log("\n📋 次のステップ:");
  console.log("  1. Supabase Auth で以下のアカウントを作成してください:");
  console.log(`     管理者:  ${PILOT_ADMIN_EMAIL}`);
  console.log(`     檀家:    ${PILOT_DANKA_EMAIL}`);
  console.log(`     ご縁さん: ${PILOT_GOEN_EMAIL}`);
  console.log("  2. 各アカウントのパスワードを安全に保管してください");
  console.log("  3. Supabase Auth でメール確認をスキップ（テスト環境）または確認メールを送信してください");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
