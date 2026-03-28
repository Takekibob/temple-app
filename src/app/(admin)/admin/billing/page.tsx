import type { Metadata } from "next";
import BillingClient from "./BillingClient";

export const metadata: Metadata = {
  title: "プラン・お支払い | てらログ 管理",
};

export default function BillingPage() {
  return <BillingClient />;
}
