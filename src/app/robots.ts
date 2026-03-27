import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/register"],
        disallow: ["/app/", "/admin/", "/api/", "/auth/logout"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
