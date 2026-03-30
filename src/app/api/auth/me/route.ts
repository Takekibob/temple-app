import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

// GET /api/auth/me — 現在のログインユーザーのロールを返す
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({ role: authUser.role });
}
