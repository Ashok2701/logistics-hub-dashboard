import { PageHeader } from "@/components/shared/MetricCard";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-card border border-border rounded-md p-12 text-center">
        <Construction className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">This module is under development</p>
        <p className="text-caption text-muted-foreground mt-1">Coming soon in a future update</p>
      </div>
    </div>
  );
}
