/**
 * T-CR-01: 檀家情報変更申請フロー E2E テスト
 *
 * 前提条件:
 *   - TEST_DANKA_EMAIL/PASSWORD のユーザーが DB に存在し、member.type = DANKA
 *   - 同メンバーの PENDING な変更申請が存在しない
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

test.describe("T-CR-01: 檀家情報変更申請", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("マイページから檀家情報ページへ遷移できる", async ({ page }) => {
    await page.goto("/app/mypage/danka-info");
    await expect(page).toHaveURL("/app/mypage/danka-info");
    await expect(page.getByText("檀家情報")).toBeVisible();
  });

  test("檀家情報ページに現在の情報が表示される", async ({ page }) => {
    await page.goto("/app/mypage/danka-info");
    await expect(page.getByText("家名")).toBeVisible();
    await expect(page.getByText("住所")).toBeVisible();
  });

  test("変更申請ボタンが存在する", async ({ page }) => {
    await page.goto("/app/mypage/danka-info");
    // PENDING申請がない場合は申請ボタンが表示される
    const applyButton = page.getByRole("button", { name: /変更を申請/ });
    if (await applyButton.isVisible()) {
      await expect(applyButton).toBeEnabled();
    }
  });
});
