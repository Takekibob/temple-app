/**
 * T-EVT-01: 管理者のイベント作成 → 公開 E2E テスト
 *
 * 前提条件:
 *   - TEST_ADMIN_EMAIL/PASSWORD のユーザーが DB に存在し、role = ADMIN
 *
 * 注記: デスクトップ Chrome プロジェクトで実行する（playwright.config.ts 参照）
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

const TEST_EVENT_TITLE = `E2Eテスト坐禅会_${Date.now()}`;

test.describe("T-EVT-01: 管理者イベント作成・公開フロー", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/admin/);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("管理ダッシュボードが表示される", async ({ page }) => {
    await expect(page.getByText("ダッシュボード")).toBeVisible();
  });

  test("イベント管理ページへ遷移できる", async ({ page }) => {
    await page.goto("/admin/events");
    await expect(page).toHaveURL("/admin/events");
    await expect(page.getByRole("link", { name: /新規作成|イベント作成/ })).toBeVisible();
  });

  test("イベント作成フォームに必須項目を入力できる", async ({ page }) => {
    await page.goto("/admin/events/new");
    await expect(page.getByText("イベント作成")).toBeVisible();

    // タイトル
    await page.getByLabel("タイトル").fill(TEST_EVENT_TITLE);

    // 説明
    await page.getByLabel("説明").fill("E2Eテスト用のイベントです。テスト終了後に削除してください。");

    // 開催日（2週間後）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split("T")[0];
    await page.getByLabel("開催日").fill(dateStr);

    // 開始・終了時間
    await page.getByLabel("開始時間").fill("10:00");
    await page.getByLabel("終了時間").fill("12:00");

    // 会場
    await page.getByLabel("会場").fill("本堂");

    // フォームに入力値が反映されていること
    await expect(page.getByLabel("タイトル")).toHaveValue(TEST_EVENT_TITLE);
  });

  test("下書き保存ができる", async ({ page }) => {
    await page.goto("/admin/events/new");

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split("T")[0];

    await page.getByLabel("タイトル").fill(TEST_EVENT_TITLE);
    await page.getByLabel("開催日").fill(dateStr);
    await page.getByLabel("開始時間").fill("10:00");
    await page.getByLabel("終了時間").fill("12:00");

    // 下書き保存ボタンをクリック
    await page.getByRole("button", { name: "下書き保存" }).click();

    // イベント一覧へリダイレクト
    await expect(page).toHaveURL("/admin/events");

    // 作成したイベントが一覧に表示されている
    await expect(page.getByText(TEST_EVENT_TITLE)).toBeVisible();
  });

  test("公開ボタンでイベントをPUBLISHEDにできる", async ({ page }) => {
    await page.goto("/admin/events/new");

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21);
    const dateStr = futureDate.toISOString().split("T")[0];
    const publishTitle = `E2E公開テスト_${Date.now()}`;

    await page.getByLabel("タイトル").fill(publishTitle);
    await page.getByLabel("開催日").fill(dateStr);
    await page.getByLabel("開始時間").fill("14:00");
    await page.getByLabel("終了時間").fill("16:00");

    // 公開ボタンをクリック
    await page.getByRole("button", { name: "公開する" }).click();

    // イベント一覧へリダイレクト
    await expect(page).toHaveURL("/admin/events");

    // 作成したイベントが一覧に表示されている
    await expect(page.getByText(publishTitle)).toBeVisible();

    // 公開バッジが表示されている
    const eventRow = page.locator("li, tr, [data-testid='event-item']").filter({ hasText: publishTitle });
    await expect(eventRow.getByText(/公開/)).toBeVisible();
  });
});
