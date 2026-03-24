/**
 * T-RSV-01: 檀家の法要予約フロー E2E テスト
 *
 * 前提条件:
 *   - TEST_DANKA_EMAIL/PASSWORD のユーザーが DB に存在し、member.type = DANKA
 *   - /api/reservations/available が利用可能なスロットを返す
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

test.describe("T-RSV-01: 法要予約フロー（4ステップ）", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("予約ページへのナビゲーション", async ({ page }) => {
    await page.goto("/app/reservations");
    await expect(page).toHaveURL("/app/reservations");
    await expect(page.getByRole("link", { name: "法要予約" })).toBeVisible();
  });

  test("ステップ1: 法要種別を選択する", async ({ page }) => {
    await page.goto("/app/reservations/new");
    // ステップインジケータが表示される
    await expect(page.getByText("種別")).toBeVisible();
    await expect(page.getByText("日時")).toBeVisible();
    // 年忌法要を選択
    await page.getByText("年忌法要").click();
    // ステップ2へ遷移
    await expect(page.getByText("所要時間")).toBeVisible();
  });

  test("ステップ2: 日付と時間を選択する", async ({ page }) => {
    await page.goto("/app/reservations/new");
    // ステップ1: 種別選択
    await page.getByText("月命日").click();

    // ステップ2: 日付を入力
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toISOString().split("T")[0];
    await page.locator('input[type="date"]').fill(dateStr);

    // スロット読み込み完了を待つ
    await page.waitForResponse((res) =>
      res.url().includes("/api/reservations/available") && res.status() === 200
    );

    // 利用可能なスロットが表示されたら最初のものをクリック
    const availableSlot = page.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
    if (await availableSlot.isEnabled()) {
      await availableSlot.click();
      // 次へボタンが有効になる
      await expect(page.getByRole("button", { name: "次へ" })).toBeEnabled();
    }
  });

  test("ステップ3→4: 詳細入力から確認画面へ", async ({ page }) => {
    await page.goto("/app/reservations/new");

    // ステップ1
    await page.getByText("その他").click();

    // ステップ2: 日付選択
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split("T")[0];
    await page.locator('input[type="date"]').fill(dateStr);

    await page.waitForResponse((res) =>
      res.url().includes("/api/reservations/available") && res.status() === 200
    );

    const slots = page.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ });
    const count = await slots.count();
    if (count > 0) {
      const enabledSlot = slots.filter({ hasNot: page.locator("[disabled]") }).first();
      if (await enabledSlot.isEnabled()) {
        await enabledSlot.click();
        await page.getByRole("button", { name: "次へ" }).click();

        // ステップ3: 詳細
        await expect(page.getByText("詳細情報を入力してください")).toBeVisible();
        await page.getByPlaceholder("ご要望やご質問があればご記入ください").fill("テスト予約");
        await page.getByRole("button", { name: "確認へ" }).click();

        // ステップ4: 確認画面
        await expect(page.getByText("以下の内容で予約します")).toBeVisible();
        await expect(page.getByRole("button", { name: "予約を確定する" })).toBeVisible();
      }
    }
  });

  test("ご縁さんが /app/reservations にアクセスすると /app へリダイレクト", async ({ page }) => {
    // ログアウトしてご縁さんとしてログイン
    await signOut(page);
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.goto("/app/reservations");
    await expect(page).toHaveURL(/\/app$/);
  });
});
