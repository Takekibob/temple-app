/**
 * T-UI-01, 02: ボトムナビゲーション E2E テスト
 *
 * T-UI-01: 檀家ユーザーには「法要予約」タブが表示される
 * T-UI-02: ご縁さんには「カレンダー」タブが表示される（「法要予約」は非表示）
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

test.describe("T-UI-01: 檀家のボトムナビゲーション", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("ボトムナビに「法要予約」タブが表示される", async ({ page }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await expect(nav.getByRole("link", { name: /法要予約/ })).toBeVisible();
  });

  test("ボトムナビに「カレンダー」タブが表示されない", async ({ page }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await expect(nav.getByRole("link", { name: /カレンダー/ })).not.toBeVisible();
  });

  test("「法要予約」タブをクリックすると /app/reservations へ遷移する", async ({ page }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await nav.getByRole("link", { name: /法要予約/ }).click();
    await expect(page).toHaveURL("/app/reservations");
  });

  test("アクティブなタブがハイライトされる", async ({ page }) => {
    await page.goto("/app");
    const homeLink = page.locator("nav a[href='/app']").first();
    // アクティブ状態のクラス（text-amber-700）が適用されていること
    await expect(homeLink).toHaveClass(/text-amber-700/);
  });
});

test.describe("T-UI-02: ご縁さんのボトムナビゲーション", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("ボトムナビに「カレンダー」タブが表示される", async ({ page }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await expect(nav.getByRole("link", { name: /カレンダー/ })).toBeVisible();
  });

  test("ボトムナビに「法要予約」タブが表示されない", async ({ page }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await expect(nav.getByRole("link", { name: /法要予約/ })).not.toBeVisible();
  });

  test("「カレンダー」タブをクリックすると /app/calendar へ遷移する", async ({ page }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await nav.getByRole("link", { name: /カレンダー/ }).click();
    await expect(page).toHaveURL("/app/calendar");
  });

  test("ボトムナビの共通タブ（ホーム・イベント・お知らせ・マイページ）が表示される", async ({
    page,
  }) => {
    await page.goto("/app");
    const nav = page.locator("nav.fixed");
    await expect(nav.getByRole("link", { name: /ホーム/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /イベント/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /お知らせ|ニュース/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /マイページ/ })).toBeVisible();
  });
});
