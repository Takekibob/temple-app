declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface PWAOptions {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    sw?: string;
    scope?: string;
    cacheOnFrontEndNav?: boolean;
    reloadOnOnline?: boolean;
    fallbacks?: {
      image?: string;
      document?: string;
      font?: string;
    };
  }

  function withPWA(options: PWAOptions): (config: NextConfig) => NextConfig;
  export = withPWA;
}
