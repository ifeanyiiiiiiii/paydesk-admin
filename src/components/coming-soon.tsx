import { Construction } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Placeholder for pages that are on the roadmap but not built yet. */
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <Construction className="mx-auto mb-2 size-8 text-muted-foreground" />
        <CardTitle>{title} is coming soon</CardTitle>
        <CardDescription className="mx-auto max-w-md">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
