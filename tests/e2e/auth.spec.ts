/**
 * T-AUTH-01〜03: 認証フロー E2E テスト
 *
 * 前提条件:
 *   - TEST_DANKA_EMAIL/PASSWORD のユーザーが DB に存在し、member.type = DANKA
 *   - TEST_GOEN_EMAIL/PASSWORD のユーザーが DB に存在し、member.type = GOEN
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

test.describe("T-AUTH-01: 檀家ログイン → ホーム画面", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("メール/パスワードでログインし /app へ遷移する", async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
    await expect(page).toHaveURL(/\/app/);
  });

  test("ホーム画面に檀家向けコンテンツが表示される", async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
    await page.waitForURL(/\/app/);
    // 法要予約セクションが存在する
    await expect(page.getByText("法要予約")).toBeVisible();
  });
});

test.describe("T-AUTH-02: ご縁さんログイン → ホーム画面", () => {
  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("メール/パスワードでログインし /app へ遷移する", async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await expect(page).toHaveURL(/\/app/);
  });

  test("ホーム画面にイベントセクションが表示される", async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.waitForURL(/\/app/);
    // ご縁さん向けのイベントセクションが存在する
    await expect(page.getByText("イベント")).toBeVisible();
  });
});

test.describe("T-AUTH-03: 新規登録フォーム", () => {
  test("ログインページから登録ページへ遷移できる", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("link", { name: "新規登録はこちら" }).click();
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByText("新規会員登録")).toBeVisible();
  });

  test("ご縁さんを選択するとフォームが表示される", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByText("ご縁さん").click();
    await expect(page.getByLabel("お名前")).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    // 檀家専用フィールドは表示されない
    await expect(page.getByLabel("家名（苗字・屋号）")).not.toBeVisible();
  });

  test("檀家を選択すると檀家専用フィールドが追加表示される", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByText("檀家").click();
    await expect(page.getByLabel("お名前")).toBeVisible();
    await expect(page.getByLabel("家名（苗字・屋号）")).toBeVisible();
    await expect(page.getByLabel("住所")).toBeVisible();
    await expect(page.getByLabel("電話番号")).toBeVisible();
  });

  test("未認証ユーザーが /app にアクセスするとログインへリダイレクト", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
