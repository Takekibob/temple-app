import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app";

export const metadata: Metadata = {
  title: {
    default: "てらログ",
    template: "%s | てらログ",
  },
  description: "お寺DX管理アプリ - 法要予約・会員管理・イベント参加をデジタル化。檀家・ご縁さんの絆をつなぐお寺専用アプリ。",
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "てらログ",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "てらログ",
    title: "てらログ - お寺DX管理アプリ",
    description: "法要予約・会員管理・イベント参加をデジタル化。檀家・ご縁さんの絆をつなぐお寺専用アプリ。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "てらログ - お寺DXアプリ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "てらログ - お寺DX管理アプリ",
    description: "法要予約・会員管理・イベント参加をデジタル化。檀家・ご縁さんの絆をつなぐお寺専用アプリ。",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#8b5e3c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
