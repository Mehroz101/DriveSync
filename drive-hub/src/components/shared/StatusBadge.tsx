import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Status = "active" | "error" | "revoked";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string }> = {
  active: { label: "active" },
  error: { label: "error" },
  revoked: { label: "revoked" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      className={cn(
        "border-transparent",
        status === "active" &&
          "bg-success/10 text-success hover:bg-success/20",
        status === "revoked" &&
          "bg-warning/10 text-warning hover:bg-warning/20",
        status === "error" &&
          "bg-destructive/10 text-destructive hover:bg-destructive/20",
        className
      )}
    >
      {config?.label}
    </Badge>
  );
}
