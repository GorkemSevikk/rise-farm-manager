import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "gold" | "cyan" | "green" | "violet";
  className?: string;
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  gold: "bg-[var(--chart-1)]/12 text-[var(--chart-1)]",
  cyan: "bg-[var(--chart-2)]/12 text-[var(--chart-2)]",
  violet: "bg-[var(--chart-3)]/12 text-[var(--chart-3)]",
  green: "bg-[var(--chart-4)]/12 text-[var(--chart-4)]",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("bg-card/70 backdrop-blur-sm", className)}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="truncate font-heading text-xl font-semibold sm:text-2xl">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}
        >
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  );
}
