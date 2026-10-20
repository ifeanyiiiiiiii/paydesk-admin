import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Businesses" };

export default function BusinessesPage() {
  return (
    <ComingSoon
      title="Businesses"
      description="Merchants on the platform, their verification status and activity."
    />
  );
}
