/**
 * Playwright テスト用認証フィクスチャ
 *
 * テスト実行前に Supabase に以下のユーザーを作成しておく:
 *   - TEST_DANKA_EMAIL/PASSWORD  → member.type = DANKA
 *   - TEST_GOEN_EMAIL/PASSWORD   → member.type = GOEN
 *   - TEST_ADMIN_EMAIL/PASSWORD  → user.role = ADMIN
 */
import { type Page } from "@playwright/test";

export const TEST_USERS = {
  danka: {
    email: process.env.TEST_DANKA_EMAIL ?? "danka@test.example.com",
    password: process.env.TEST_DANKA_PASSWORD ?? "TestPass123!",
    displayName: "テスト檀家",
  },
  goen: {
    email: process.env.TEST_GOEN_EMAIL ?? "goen@test.example.com",
    password: process.env.TEST_GOEN_PASSWORD ?? "TestPass123!",
    displayName: "テストご縁さん",
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? "admin@test.example.com",
    password: process.env.TEST_ADMIN_PASSWORD ?? "TestPass123!",
    displayName: "テスト住職",
  },
} as const;

/** ログインフォームを使ってサインインする */
export async function signIn(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/auth/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  // ホーム画面への遷移を待つ
  await page.waitForURL(/\/(app|admin)/, { timeout: 10_000 });
}

/** ログアウトする */
export async function signOut(page: Page): Promise<void> {
  await page.goto("/auth/logout");
}
