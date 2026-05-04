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
  EventStatus,
} from "../src/generated/prisma/enums";

// ============================================================
// パイロット用メールアドレス（Supabase Auth に同メールで登録すること）
// ============================================================
const PILOT_ADMIN_EMAIL = process.env.PILOT_ADMIN_EMAIL ?? "admin@enshoji-pilot.example";
const PILOT_DANKA_EMAIL = process.env.PILOT_DANKA_EMAIL ?? "yamada@enshoji-pilot.example";
const PILOT_GOEN_EMAIL = process.env.PILOT_GOEN_EMAIL ?? "suzuki@enshoji-pilot.example";

// ============================================================
// 第2デモ寺院（マルチテンプル検証用）
// ============================================================
const DEMO2_ADMIN_EMAIL = process.env.DEMO2_ADMIN_EMAIL ?? "admin@houn-demo.example";
const DEMO2_DANKA_EMAIL = process.env.DEMO2_DANKA_EMAIL ?? "sato@houn-demo.example";

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
      category: "ZAZEN",
      eventDate: new Date("2026-04-19T00:00:00Z"),
      startTime: "10:00",
      endTime: "12:00",
      location: "本堂",
      capacity: 20,
      fee: 1000,
      
      status: EventStatus.PUBLISHED,
    },
    {
      id: "pilot-event-shakyo-001",
      templeId: temple.id,
      title: "写経体験 ～心を静める時間～",
      description:
        "般若心経の写経体験です。筆ペンを使って丁寧に文字を書くことで、日常の喧騒を忘れ、心を静める時間をお過ごしいただけます。道具はすべてご用意しております。",
      category: "SHAKYO",
      eventDate: new Date("2026-05-03T00:00:00Z"),
      startTime: "14:00",
      endTime: "16:00",
      location: "客殿",
      capacity: 15,
      fee: 800,
      
      status: EventStatus.PUBLISHED,
    },
    {
      id: "pilot-event-seasonal-001",
      templeId: temple.id,
      title: "花まつり（仏誕会）",
      description:
        "4月8日はお釈迦様のお誕生日。お花で飾った花御堂に甘茶をかけてお祝いします。子どもから大人まで楽しめる春の恒例行事です。甘茶のふるまいもございます。",
      category: "SEASONAL",
      eventDate: new Date("2026-04-08T00:00:00Z"),
      startTime: "10:00",
      endTime: "15:00",
      location: "境内",
      capacity: null,
      fee: 0,
      
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
  // 7. 第2デモ寺院（法雲寺）— マルチテンプル検証用
  // ----------------------------------------------------------
  const temple2 = await prisma.temple.upsert({
    where: { id: "demo-temple-002" },
    update: {},
    create: {
      id: "demo-temple-002",
      name: "法雲寺",
      denomination: "臨済宗",
      address: "京都府京都市上京区寺町通広小路上る北之辺町395",
      phone: "075-000-0000",
      email: "info@houn-demo.example",
    },
  });
  console.log(`  ✅ Temple 2: ${temple2.name} (${temple2.id})`);

  const admin2 = await prisma.user.upsert({
    where: { email: DEMO2_ADMIN_EMAIL },
    update: { role: Role.ADMIN },
    create: {
      id: "demo2-admin-user-001",
      templeId: temple2.id,
      role: Role.ADMIN,
      name: "佐藤 住職",
      email: DEMO2_ADMIN_EMAIL,
    },
  });
  console.log(`  ✅ Temple 2 admin: ${admin2.name} <${admin2.email}>`);

  const danka2 = await prisma.user.upsert({
    where: { email: DEMO2_DANKA_EMAIL },
    update: {},
    create: {
      id: "demo2-danka-user-001",
      templeId: temple2.id,
      role: Role.MEMBER,
      name: "佐藤 次郎",
      email: DEMO2_DANKA_EMAIL,
      phone: "090-0003-0003",
    },
  });

  await prisma.member.upsert({
    where: { userId: danka2.id },
    update: {},
    create: {
      id: "demo2-danka-member-001",
      templeId: temple2.id,
      userId: danka2.id,
      type: MemberType.DANKA,
      familyName: "佐藤家",
      address: "京都府京都市上京区1-2-3",
      phone: "090-0003-0003",
      email: DEMO2_DANKA_EMAIL,
    },
  });
  console.log(`  ✅ Temple 2 danka: ${danka2.name} <${danka2.email}>`);

  // 法雲寺のサンプルイベント
  await prisma.event.upsert({
    where: { id: "demo2-event-zazen-001" },
    update: {},
    create: {
      id: "demo2-event-zazen-001",
      templeId: temple2.id,
      title: "朝の坐禅会",
      description: "早朝の静かな時間に坐禅を行います。初心者歓迎です。",
      category: "ZAZEN",
      eventDate: new Date("2026-04-26T00:00:00Z"),
      startTime: "06:00",
      endTime: "07:30",
      location: "禅堂",
      capacity: 10,
      fee: 500,
      
      status: EventStatus.PUBLISHED,
    },
  });
  console.log(`  ✅ Temple 2 event: 朝の坐禅会`);

  console.log("\n✨ Seed complete!");
  console.log("\n📋 次のステップ:");
  console.log("  1. Supabase Auth で以下のアカウントを作成してください:");
  console.log(`     [円照寺] 管理者:  ${PILOT_ADMIN_EMAIL}`);
  console.log(`     [円照寺] 檀家:    ${PILOT_DANKA_EMAIL}`);
  console.log(`     [円照寺] ご縁さん: ${PILOT_GOEN_EMAIL}`);
  console.log(`     [法雲寺] 管理者:  ${DEMO2_ADMIN_EMAIL}`);
  console.log(`     [法雲寺] 檀家:    ${DEMO2_DANKA_EMAIL}`);
  console.log("  2. 各アカウントのパスワードを安全に保管してください");
  console.log("  3. Supabase Auth でメール確認をスキップ（テスト環境）または確認メールを送信してください");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
