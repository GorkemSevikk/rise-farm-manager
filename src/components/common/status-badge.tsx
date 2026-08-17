import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DROP_STATUS_LABELS,
  FARM_STATUS_LABELS,
  FARM_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import type { DropStatus, FarmStatus, PaymentStatus } from "@/types";

export function FarmStatusBadge({ status }: { status: FarmStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", FARM_STATUS_TONES[status])}>
      {FARM_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        status === "paid"
          ? "bg-[var(--success)]/15 text-[var(--success)]"
          : "bg-[var(--warning)]/15 text-[var(--warning)]"
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DropStatusBadge({ status }: { status: DropStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        status === "sold"
          ? "bg-[var(--success)]/15 text-[var(--success)]"
          : "bg-muted text-muted-foreground"
      )}
    >
      {DROP_STATUS_LABELS[status]}
    </Badge>
  );
}
