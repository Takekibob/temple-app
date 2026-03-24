/**
 * T-NTF-02, 03: お知らせのセグメント配信 E2E テスト
 *
 * 前提条件:
 *   - TEST_ADMIN_EMAIL/PASSWORD のユーザーが管理者として DB に存在
 *   - TEST_DANKA_EMAIL/PASSWORD のユーザーが檀家として DB に存在
 *   - TEST_GOEN_EMAIL/PASSWORD のユーザーがご縁さんとして DB に存在
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS, signIn, signOut } from "./fixtures/auth";

const DANKA_ONLY_TITLE = `【檀家限定】E2Eテスト_${Date.now()}`;
const GOEN_ONLY_TITLE = `【ご縁さん限定】E2Eテスト_${Date.now()}`;

test.describe("T-NTF-02: 檀家限定お知らせの作成と配信確認", () => {
  test("管理者が檀家限定お知らせを作成・公開できる", async ({ page }) => {
    await signIn(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/announcements/new");

    // 配信対象: 檀家のみ
    await page.getByRole("radio", { name: "檀家のみ" }).check();

    // タイトルと本文
    await page.locator('input[placeholder="例：お盆法要のご案内"]').fill(DANKA_ONLY_TITLE);
    await page.locator("textarea").fill("これは檀家の方のみに表示されるお知らせです。");

    // 公開する
    await page.getByRole("button", { name: "公開する" }).click();
    await expect(page).toHaveURL("/admin/announcements");
    await expect(page.getByText(DANKA_ONLY_TITLE)).toBeVisible();

    await signOut(page);
  });

  test("檀家ユーザーは檀家限定お知らせを閲覧できる", async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
    await page.goto("/app/news");
    await expect(page.getByText(DANKA_ONLY_TITLE)).toBeVisible();
    await signOut(page);
  });

  test("ご縁さんは檀家限定お知らせを閲覧できない", async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.goto("/app/news");
    await expect(page.getByText(DANKA_ONLY_TITLE)).not.toBeVisible();
    await signOut(page);
  });
});

test.describe("T-NTF-03: ご縁さん限定お知らせの作成と配信確認", () => {
  test("管理者がご縁さん限定お知らせを作成・公開できる", async ({ page }) => {
    await signIn(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto("/admin/announcements/new");

    // 配信対象: ご縁さんのみ
    await page.getByRole("radio", { name: "ご縁さんのみ" }).check();

    await page.locator('input[placeholder="例：お盆法要のご案内"]').fill(GOEN_ONLY_TITLE);
    await page.locator("textarea").fill("これはご縁さんの方のみに表示されるお知らせです。");

    await page.getByRole("button", { name: "公開する" }).click();
    await expect(page).toHaveURL("/admin/announcements");
    await expect(page.getByText(GOEN_ONLY_TITLE)).toBeVisible();

    await signOut(page);
  });

  test("ご縁さんはご縁さん限定お知らせを閲覧できる", async ({ page }) => {
    await signIn(page, TEST_USERS.goen.email, TEST_USERS.goen.password);
    await page.goto("/app/news");
    await expect(page.getByText(GOEN_ONLY_TITLE)).toBeVisible();
    await signOut(page);
  });

  test("檀家ユーザーはご縁さん限定お知らせを閲覧できない", async ({ page }) => {
    await signIn(page, TEST_USERS.danka.email, TEST_USERS.danka.password);
    await page.goto("/app/news");
    await expect(page.getByText(GOEN_ONLY_TITLE)).not.toBeVisible();
    await signOut(page);
  });
});

test.describe("お知らせ管理基本操作", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("お知らせ管理一覧ページが表示される", async ({ page }) => {
    await page.goto("/admin/announcements");
    await expect(page).toHaveURL("/admin/announcements");
    await expect(page.getByRole("link", { name: /新規作成|お知らせ作成/ })).toBeVisible();
  });

  test("下書き保存ができる", async ({ page }) => {
    await page.goto("/admin/announcements/new");
    const draftTitle = `【下書き】E2Eテスト_${Date.now()}`;

    await page.locator('input[placeholder="例：お盆法要のご案内"]').fill(draftTitle);
    await page.locator("textarea").fill("下書きテスト本文");

    await page.getByRole("button", { name: "下書き保存" }).click();
    await expect(page).toHaveURL("/admin/announcements");
    await expect(page.getByText(draftTitle)).toBeVisible();

    // 下書きバッジが表示される
    const item = page.locator("li, tr, article").filter({ hasText: draftTitle });
    await expect(item.getByText(/下書き/)).toBeVisible();
  });
});
