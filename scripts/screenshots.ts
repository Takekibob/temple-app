/**
 * 操作マニュアル用スクリーンショット自動取得スクリプト
 *
 * 使い方:
 *   npx ts-node scripts/screenshots.ts
 *
 * 必要な環境変数（.env.local または環境変数に設定）:
 *   SCREENSHOT_BASE_URL     - 対象URL（デフォルト: http://localhost:3000）
 *   SCREENSHOT_ADMIN_EMAIL  - 管理者メールアドレス
 *   SCREENSHOT_ADMIN_PASS   - 管理者パスワード
 *   SCREENSHOT_DANKA_EMAIL  - 檀家メールアドレス
 *   SCREENSHOT_DANKA_PASS   - 檀家パスワード
 *   SCREENSHOT_GOEN_EMAIL   - ご縁さんメールアドレス
 *   SCREENSHOT_GOEN_PASS    - ご縁さんパスワード
 *
 * 出力: docs/screenshots/ ディレクトリ
 */

import { chromium, type Page, type Browser } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// 設定
// ============================================================
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "docs", "screenshots");

const ADMIN_EMAIL = process.env.SCREENSHOT_ADMIN_EMAIL ?? "admin@enshoji-pilot.example";
const ADMIN_PASS = process.env.SCREENSHOT_ADMIN_PASS ?? "";
const DANKA_EMAIL = process.env.SCREENSHOT_DANKA_EMAIL ?? "yamada@enshoji-pilot.example";
const DANKA_PASS = process.env.SCREENSHOT_DANKA_PASS ?? "";
const GOEN_EMAIL = process.env.SCREENSHOT_GOEN_EMAIL ?? "suzuki@enshoji-pilot.example";
const GOEN_PASS = process.env.SCREENSHOT_GOEN_PASS ?? "";

// ============================================================
// ユーティリティ
// ============================================================
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function saveScreenshot(page: Page, name: string, description: string) {
  const filepath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 ${description} → ${path.relative(process.cwd(), filepath)}`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL(/\/(app|admin)/, { timeout: 10_000 });
}

async function logout(page: Page) {
  await page.goto(`${BASE_URL}/auth/logout`);
  await page.waitForURL(/\/auth\/login/, { timeout: 5_000 }).catch(() => {});
}

// ============================================================
// スクリーンショット定義
// ============================================================

// --- 共通画面 ---
async function capturePublicPages(page: Page) {
  console.log("\n📌 公開ページ");

  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState("networkidle");
  await saveScreenshot(page, "01-login", "ログインページ");

  await page.goto(`${BASE_URL}/auth/register`);
  await page.waitForLoadState("networkidle");
  await saveScreenshot(page, "02-register", "新規登録ページ");
}

// --- 管理者画面 ---
async function captureAdminPages(browser: Browser) {
  if (!ADMIN_PASS) {
    console.log("\n⚠️  SCREENSHOT_ADMIN_PASS が未設定のため管理者画面をスキップ");
    return;
  }

  console.log("\n📌 管理者画面");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ja-JP",
  });
  const page = await context.newPage();

  try {
    await login(page, ADMIN_EMAIL, ADMIN_PASS);

    // ダッシュボード
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "10-admin-dashboard", "管理者ダッシュボード");

    // イベント管理
    await page.goto(`${BASE_URL}/admin/events`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "11-admin-events", "イベント管理一覧");

    // イベント作成
    await page.goto(`${BASE_URL}/admin/events/new`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "12-admin-event-new", "イベント作成フォーム");

    // 会員管理
    await page.goto(`${BASE_URL}/admin/members`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "13-admin-members", "会員管理一覧");

    // 予約管理
    await page.goto(`${BASE_URL}/admin/reservations`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "14-admin-reservations", "予約管理一覧");

    // お知らせ管理
    await page.goto(`${BASE_URL}/admin/announcements`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "15-admin-announcements", "お知らせ管理");

    // お知らせ作成
    await page.goto(`${BASE_URL}/admin/announcements/new`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "16-admin-announcement-new", "お知らせ作成フォーム");
  } finally {
    await logout(page);
    await context.close();
  }
}

// --- 檀家（会員アプリ）---
async function captureDankaPages(browser: Browser) {
  if (!DANKA_PASS) {
    console.log("\n⚠️  SCREENSHOT_DANKA_PASS が未設定のため檀家画面をスキップ");
    return;
  }

  console.log("\n📌 会員アプリ（檀家）");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await login(page, DANKA_EMAIL, DANKA_PASS);

    // ホーム
    await page.goto(`${BASE_URL}/app`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "20-app-home-danka", "ホーム（檀家）");

    // 法要予約一覧
    await page.goto(`${BASE_URL}/app/reservations`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "21-app-reservations", "法要予約一覧");

    // 法要予約新規作成
    await page.goto(`${BASE_URL}/app/reservations/new`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "22-app-reservation-new", "法要予約フォーム（種別選択）");

    // イベント一覧
    await page.goto(`${BASE_URL}/app/events`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "23-app-events", "イベント一覧");

    // お知らせ
    await page.goto(`${BASE_URL}/app/news`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "24-app-news", "お知らせ一覧");

    // マイページ
    await page.goto(`${BASE_URL}/app/mypage`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "25-app-mypage", "マイページ");
  } finally {
    await logout(page);
    await context.close();
  }
}

// --- ご縁さん ---
async function captureGoenPages(browser: Browser) {
  if (!GOEN_PASS) {
    console.log("\n⚠️  SCREENSHOT_GOEN_PASS が未設定のためご縁さん画面をスキップ");
    return;
  }

  console.log("\n📌 会員アプリ（ご縁さん）");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await login(page, GOEN_EMAIL, GOEN_PASS);

    // ホーム
    await page.goto(`${BASE_URL}/app`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "30-app-home-goen", "ホーム（ご縁さん）");

    // イベント一覧
    await page.goto(`${BASE_URL}/app/events`);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, "31-app-events-goen", "イベント一覧（ご縁さん）");
  } finally {
    await logout(page);
    await context.close();
  }
}

// --- エラーページ ---
async function captureErrorPages(page: Page) {
  console.log("\n📌 エラーページ");

  await page.goto(`${BASE_URL}/this-page-does-not-exist-404`);
  await page.waitForLoadState("networkidle");
  await saveScreenshot(page, "90-404", "404ページ");

  await page.goto(`${BASE_URL}/maintenance`);
  await page.waitForLoadState("networkidle");
  await saveScreenshot(page, "91-maintenance", "メンテナンスページ");
}

// ============================================================
// メイン
// ============================================================
async function main() {
  ensureOutputDir();
  console.log(`🚀 スクリーンショット取得開始`);
  console.log(`   対象URL: ${BASE_URL}`);
  console.log(`   出力先:  ${OUTPUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    locale: "ja-JP",
  });

  try {
    await capturePublicPages(page);
    await captureErrorPages(page);
    await captureAdminPages(browser);
    await captureDankaPages(browser);
    await captureGoenPages(browser);

    // インデックスファイル生成
    const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".png")).sort();
    const index = [
      "# てらログ スクリーンショット一覧",
      "",
      `生成日時: ${new Date().toLocaleString("ja-JP")}`,
      `対象URL: ${BASE_URL}`,
      "",
      "| ファイル名 | 画面 |",
      "|---|---|",
      ...files.map((f) => `| \`${f}\` | ![${f}](./${f}) |`),
    ].join("\n");
    fs.writeFileSync(path.join(OUTPUT_DIR, "INDEX.md"), index);
    console.log(`\n✨ 完了: ${files.length} 枚のスクリーンショットを保存しました`);
    console.log(`   📄 インデックス: docs/screenshots/INDEX.md`);
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ スクリーンショット取得失敗:", e);
  process.exit(1);
});
