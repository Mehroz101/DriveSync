import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Status = "active" | "error" | "inactive";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string }> = {
  active: { label: "active" },
  error: { label: "error" },
  inactive: { label: "inactive" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      className={cn(
        "border-transparent",
        status === "active" &&
          "bg-success text-success-foreground hover:bg-success/80",
        status === "error" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        status === "inactive" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
