import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Fees" };

export default function FeesPage() {
  return (
    <ComingSoon
      title="Fees"
      description="Default and custom fee rules: percentage, flat fee and cap."
    />
  );
}
