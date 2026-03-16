import { PageHeader } from "@/components/shared/MetricCard";
import { Construction } from "lucide-react";
import { motion } from "framer-motion";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <motion.div
        className="bg-card rounded-xl border border-border shadow-card p-16 text-center"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto mb-4 flex items-center justify-center">
          <Construction className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Module under development</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">Coming soon in a future update</p>
      </motion.div>
    </div>
  );
}
