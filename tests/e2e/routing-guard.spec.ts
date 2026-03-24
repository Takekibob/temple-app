/**
 * T-UI-05: ルーティングガード E2E テスト
 *
 * - ご縁さんが /app/reservations にアクセス → /app へリダイレクト
 * - 未認証ユーザーが /app にアクセス → /auth/login へリダイレクト
 * - 未認証ユーザーが /admin にアクセス → /auth/login へリダイレクト
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

test.describe("T-UI-05: ルーティングガード", () => {
  test("未認証ユーザーが /app にアクセスするとログインへリダイレクト", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("未認証ユーザーが /admin にアクセスするとログインへリダイレクト", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("未認証ユーザーが /app/reservations にアクセスするとログインへリダイレクト", async ({
    page,
  }) => {
    await page.goto("/app/reservations");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("ご縁さんが /app/reservations にアクセスすると /app へリダイレクト", async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.goto("/app/reservations");
    // ReservationsLayout が member.type !== DANKA の場合に /app へリダイレクト
    await expect(page).toHaveURL(/\/app$/);
    await signOut(page);
  });

  test("ご縁さんが /app/reservations/new にアクセスすると /app へリダイレクト", async ({
    page,
  }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.goto("/app/reservations/new");
    await expect(page).toHaveURL(/\/app$/);
    await signOut(page);
  });

  test("檀家ユーザーは /app/reservations にアクセスできる", async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
    await page.goto("/app/reservations");
    await expect(page).toHaveURL("/app/reservations");
    await signOut(page);
  });

  test("認証済みユーザーが /auth/login にアクセスすると /app へリダイレクト", async ({
    page,
  }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.goto("/auth/login");
    await expect(page).toHaveURL(/\/app/);
    await signOut(page);
  });
});
