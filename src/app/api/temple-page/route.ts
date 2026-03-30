import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const authUser = await requireAdmin();

  const page = await prisma.templePage.findUnique({
    where: { templeId: authUser.templeId },
  });

  return NextResponse.json(page);
}

export async function PUT(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json();
  const {
    slug,
    template,
    heroImageUrl,
    galleryImageUrls,
    customSections,
    seoTitle,
    seoDescription,
  } = body;

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  // スラッグ重複チェック（他寺院のスラッグと被らないように）
  const existing = await prisma.templePage.findUnique({ where: { slug } });
  if (existing && existing.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "SLUG_TAKEN" }, { status: 409 });
  }

  const page = await prisma.templePage.upsert({
    where: { templeId: authUser.templeId },
    create: {
      templeId: authUser.templeId,
      slug,
      template: template ?? "CLASSIC",
      heroImageUrl: heroImageUrl ?? null,
      galleryImageUrls: galleryImageUrls ?? [],
      customSections: customSections ?? [],
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
    },
    update: {
      slug,
      template: template ?? "CLASSIC",
      heroImageUrl: heroImageUrl ?? null,
      galleryImageUrls: galleryImageUrls ?? [],
      customSections: customSections ?? [],
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
    },
  });

  return NextResponse.json(page);
}
