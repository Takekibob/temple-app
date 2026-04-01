import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { validatePhone, validatePostalCode } from "@/lib/memberValidation";

interface CsvRow {
  name: string;
  email: string;
  type: string;
  familyName: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  notes?: string;
  joinedDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });

    const text = await file.text();
    const { data, errors } = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: "CSVの解析に失敗しました", details: errors }, { status: 400 });
    }

    const results: { row: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // header = 1

      if (!row.name || !row.email || !row.type || !row.familyName) {
        results.push({ row: rowNum, success: false, error: "name, email, type, familyName は必須です" });
        continue;
      }

      if (!["DANKA", "GOEN"].includes(row.type.toUpperCase())) {
        results.push({ row: rowNum, success: false, error: `typeは DANKA または GOEN である必要があります (got: ${row.type})` });
        continue;
      }

      if (row.phone) {
        const phoneErr = validatePhone(row.phone);
        if (phoneErr) {
          results.push({ row: rowNum, success: false, error: `電話番号: ${phoneErr}` });
          continue;
        }
      }

      if (row.postalCode) {
        const postalErr = validatePostalCode(row.postalCode);
        if (postalErr) {
          results.push({ row: rowNum, success: false, error: `郵便番号: ${postalErr}` });
          continue;
        }
      }

      try {
        const existing = await prisma.user.findUnique({ where: { email: row.email } });
        let user;
        if (existing) {
          user = existing;
        } else {
          user = await prisma.user.create({
            data: {
              templeId: authUser.templeId,
              name: row.name,
              email: row.email,
              role: "MEMBER",
            },
          });
        }

        const memberExists = await prisma.member.findUnique({ where: { userId: user.id } });
        if (memberExists) {
          results.push({ row: rowNum, success: false, error: `${row.email} は既に会員登録済みです` });
          continue;
        }

        await prisma.member.create({
          data: {
            templeId: authUser.templeId,
            userId: user.id,
            type: row.type.toUpperCase() as "DANKA" | "GOEN",
            familyName: row.familyName,
            phone: row.phone || undefined,
            address: row.address || undefined,
            postalCode: row.postalCode || undefined,
            notes: row.notes || undefined,
            ...(row.joinedDate ? { joinedDate: new Date(row.joinedDate) } : {}),
          },
        });

        results.push({ row: rowNum, success: true });
      } catch {
        results.push({ row: rowNum, success: false, error: "DB登録に失敗しました" });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({ results, successCount, totalRows: data.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
