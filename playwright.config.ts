import { defineConfig, devices } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";

// .env.test を読み込む（存在する場合のみ）
dotenvConfig({ path: ".env.test" });

/**
 * E2E テスト設定
 *
 * 必要な環境変数（.env.test に設定）:
 *   PLAYWRIGHT_BASE_URL    - テスト対象 URL（デフォルト: http://localhost:3000）
 *   TEST_DANKA_EMAIL       - 檀家テストユーザーのメールアドレス
 *   TEST_DANKA_PASSWORD    - 檀家テストユーザーのパスワード
 *   TEST_GOEN_EMAIL        - ご縁さんテストユーザーのメールアドレス
 *   TEST_GOEN_PASSWORD     - ご縁さんテストユーザーのパスワード
 *   TEST_ADMIN_EMAIL       - 管理者テストユーザーのメールアドレス
 *   TEST_ADMIN_PASSWORD    - 管理者テストユーザーのパスワード
 */

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,   // 状態共有があるため直列実行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // モバイルビューポート（主なターゲット）
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },

  projects: [
    // モバイル（Chrome ヘッドレス）
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    // デスクトップ（管理画面のテストはこちら）
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
      testMatch: "**/event-admin.spec.ts",
    },
  ],

  // ローカル実行時は Next.js dev サーバーを起動
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
