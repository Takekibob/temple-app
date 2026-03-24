/**
 * T-EVT-04: ご縁さんのイベント参加申込フロー E2E テスト
 *
 * 前提条件:
 *   - TEST_GOEN_EMAIL/PASSWORD のユーザーが DB に存在し、member.type = GOEN
 *   - 公開済みイベントが DB に存在する
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

test.describe("T-EVT-04: イベント参加申込フロー", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("イベント一覧ページが表示される", async ({ page }) => {
    await page.goto("/app/events");
    await expect(page).toHaveURL("/app/events");
    // イベント一覧または「イベントはありません」が表示される
    const content = page.locator("main, [data-testid='events-list'], .event-list").first();
    await expect(content).toBeVisible();
  });

  test("イベント詳細ページへ遷移できる", async ({ page }) => {
    await page.goto("/app/events");
    const eventLinks = page.getByRole("link").filter({ hasText: /詳細|申込/ });
    const count = await eventLinks.count();
    if (count > 0) {
      await eventLinks.first().click();
      await expect(page).toHaveURL(/\/app\/events\/[^/]+$/);
    } else {
      // イベントがない場合はスキップ
      test.skip();
    }
  });

  test("申込ページに遷移し参加人数を変更できる", async ({ page }) => {
    await page.goto("/app/events");
    // 申込可能なイベントへのリンクを探す
    const applyLinks = page.getByRole("link", { name: /参加申込|申込/ });
    const count = await applyLinks.count();
    if (count === 0) {
      // イベント詳細から申込ページへ
      const eventLinks = page.getByRole("link").filter({ hasNotText: /ログイン|登録|ホーム/ });
      if (await eventLinks.count() > 0) {
        await eventLinks.first().click();
        const detailApply = page.getByRole("link", { name: /参加申込|申込する/ });
        if (await detailApply.count() > 0) {
          await detailApply.first().click();
        } else {
          test.skip();
          return;
        }
      } else {
        test.skip();
        return;
      }
    } else {
      await applyLinks.first().click();
    }

    await expect(page).toHaveURL(/\/app\/events\/[^/]+\/apply/);
    await expect(page.getByText("参加申込")).toBeVisible();

    // 参加人数の増減ボタン
    const incrementBtn = page.getByRole("button", { name: "＋" });
    const decrementBtn = page.getByRole("button", { name: "−" });
    const countDisplay = page.locator("span").filter({ hasText: /^[1-6]$/ }).first();

    await expect(countDisplay).toHaveText("1");
    await incrementBtn.click();
    await expect(countDisplay).toHaveText("2");
    await decrementBtn.click();
    await expect(countDisplay).toHaveText("1");

    // 同意チェックボックスにチェック → 申込ボタンが有効になる
    const checkbox = page.getByRole("checkbox");
    await checkbox.check();
    const submitBtn = page.getByRole("button", { name: /申込を確定する|キャンセル待ちに登録/ });
    await expect(submitBtn).toBeEnabled();
  });

  test("同意なしでは申込ボタンが無効", async ({ page }) => {
    await page.goto("/app/events");
    const applyLinks = page.getByRole("link", { name: /参加申込|申込/ });
    if (await applyLinks.count() === 0) {
      test.skip();
      return;
    }
    await applyLinks.first().click();
    await expect(page).toHaveURL(/\/app\/events\/[^/]+\/apply/);

    const submitBtn = page.getByRole("button", { name: /申込を確定する|キャンセル待ちに登録/ });
    await expect(submitBtn).toBeDisabled();
  });
});
