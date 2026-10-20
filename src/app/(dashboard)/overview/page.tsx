import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <ComingSoon
      title="Overview"
      description="Headline numbers and volume charts. Click any chart to open the matching transactions."
    />
  );
}
