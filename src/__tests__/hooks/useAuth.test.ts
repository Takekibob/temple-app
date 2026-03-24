/**
 * useAuth() フックのユニットテスト
 *
 * Supabase クライアントと fetch をモックして
 * 認証状態変化に応じた返り値を検証する。
 */
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";

// ---------- Supabase クライアントのモック ----------
let authStateCallback: ((event: string, session: unknown) => void) | null = null;

const mockUnsubscribe = jest.fn();

// モック実装を保持する関数（resetAllMocks 後に再設定するため）
function setupOnAuthStateChange() {
  return jest.fn((cb: typeof authStateCallback) => {
    authStateCallback = cb;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
}

const mockSupabase = {
  auth: {
    onAuthStateChange: setupOnAuthStateChange(),
  },
};

jest.mock("@/lib/supabase", () => ({
  createClient: () => mockSupabase,
}));

// ---------- fetch のモック ----------
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------- テストヘルパー ----------
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  email_confirmed_at: "2026-01-01",
};

const mockSession = { user: mockUser };

async function triggerAuthChange(session: typeof mockSession | null) {
  await act(async () => {
    authStateCallback?.("SIGNED_IN", session);
  });
}

// ---------- テスト ----------
describe("useAuth", () => {
  beforeEach(() => {
    // fetch の返り値キューと呼び出し履歴をリセット
    mockFetch.mockReset();
    mockUnsubscribe.mockClear();
    authStateCallback = null;
    // onAuthStateChange の実装を再設定（resetAllMocks で失われるのを防ぐ）
    mockSupabase.auth.onAuthStateChange = setupOnAuthStateChange();
  });

  it("初期状態では loading=true, user=null", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.memberType).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it("未ログイン状態では全て null / false", async () => {
    const { result } = renderHook(() => useAuth());

    await triggerAuthChange(null);

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isDanka).toBe(false);
    expect(result.current.isGoen).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isStaff).toBe(false);
  });

  it("檀家ユーザーのログインで isDanka=true, isGoen=false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { role: "member", memberType: "danka", memberId: "m-1" },
      }),
    });

    const { result } = renderHook(() => useAuth());
    await triggerAuthChange(mockSession);

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isDanka).toBe(true);
    expect(result.current.isGoen).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.memberId).toBe("m-1");
  });

  it("ご縁さんのログインで isGoen=true, isDanka=false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { role: "member", memberType: "goen", memberId: "m-2" },
      }),
    });

    const { result } = renderHook(() => useAuth());
    await triggerAuthChange(mockSession);

    expect(result.current.isGoen).toBe(true);
    expect(result.current.isDanka).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("admin ロールのログインで isAdmin=true, isStaff=true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { role: "admin", memberType: null, memberId: null },
      }),
    });

    const { result } = renderHook(() => useAuth());
    await triggerAuthChange(mockSession);

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isStaff).toBe(true);
    expect(result.current.isDanka).toBe(false);
  });

  it("super_admin ロールのログインで isAdmin=true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { role: "super_admin", memberType: null, memberId: null },
      }),
    });

    const { result } = renderHook(() => useAuth());
    await triggerAuthChange(mockSession);

    expect(result.current.isAdmin).toBe(true);
  });

  it("staff ロールのログインで isStaff=true, isAdmin=false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { role: "staff", memberType: null, memberId: null },
      }),
    });

    const { result } = renderHook(() => useAuth());
    await triggerAuthChange(mockSession);

    expect(result.current.isStaff).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("/api/me が失敗した場合はプロフィールが null のまま", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "UNAUTHORIZED" }),
    });

    const { result } = renderHook(() => useAuth());
    await triggerAuthChange(mockSession);

    expect(result.current.memberType).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it("アンマウント時に Supabase サブスクリプションが解除される", () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
