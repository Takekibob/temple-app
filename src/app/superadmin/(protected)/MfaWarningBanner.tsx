"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function MfaWarningBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      // MFA 未登録なら警告バナーを表示
      if (!factors?.totp || factors.totp.length === 0) {
        setShowBanner(true);
      }
    })();
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-2.5 flex items-center justify-between gap-4">
      <p className="text-amber-200 text-xs">
        ⚠️ 二段階認証（MFA）が未設定です。アカウントのセキュリティのために設定を完了してください。
      </p>
      <Link
        href="/superadmin/mfa/enroll"
        className="shrink-0 px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700"
      >
        今すぐ設定
      </Link>
    </div>
  );
}
