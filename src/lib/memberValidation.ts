/**
 * 会員情報のバリデーション関数
 * サーバー・クライアント両方から利用可能（純粋関数）
 */

/** 日本の電話番号（ハイフン・スペース除去後10〜11桁、先頭0）*/
export function validatePhone(phone: string): string | null {
  if (!phone) return null; // 任意項目
  const digits = phone.replace(/[-\s()]/g, "");
  if (!/^0\d{9,10}$/.test(digits)) {
    return "電話番号は10〜11桁の数字で入力してください（例：090-1234-5678）";
  }
  return null;
}

/** 日本の郵便番号（7桁 or XXX-XXXX）*/
export function validatePostalCode(postalCode: string): string | null {
  if (!postalCode) return null; // 任意項目
  const digits = postalCode.replace(/-/g, "");
  if (!/^\d{7}$/.test(digits)) {
    return "郵便番号は7桁で入力してください（例：123-4567）";
  }
  return null;
}

/** 郵便番号を XXX-XXXX 形式に正規化 */
export function normalizePostalCode(postalCode: string): string {
  const digits = postalCode.replace(/-/g, "");
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return postalCode;
}

/**
 * タイプとステージの整合性チェック
 * - DANKA（檀家）は stage = DANKA のみ許可
 * - GOEN（ご縁さん）は stage = GOEN / PROSPECT / DANKA_CANDIDATE のみ許可
 */
export function validateTypeStage(
  type: "DANKA" | "GOEN",
  stage: "GOEN" | "PROSPECT" | "DANKA_CANDIDATE" | "DANKA"
): string | null {
  if (type === "DANKA" && stage !== "DANKA") {
    return "檀家のステージは「檀家」のみ設定できます";
  }
  if (type === "GOEN" && stage === "DANKA") {
    return "ご縁さんのステージに「檀家」は設定できません（「檀家に昇格」ボタンを使用してください）";
  }
  return null;
}

/** タイプに対して選択可能なステージ一覧を返す */
export function allowedStages(
  type: "DANKA" | "GOEN"
): ("GOEN" | "PROSPECT" | "DANKA_CANDIDATE" | "DANKA")[] {
  return type === "DANKA"
    ? ["DANKA"]
    : ["GOEN", "PROSPECT", "DANKA_CANDIDATE"];
}
