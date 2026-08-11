import { cn } from "@/lib/utils";

type StatusType = "online" | "offline" | "pending" | "downloading" | "completed" | "error";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { color: string; bgColor: string; label: string }> = {
  online: { color: "bg-green-500", bgColor: "bg-green-500/20", label: "Online" },
  offline: { color: "bg-red-500", bgColor: "bg-red-500/20", label: "Offline" },
  pending: { color: "bg-amber-500", bgColor: "bg-amber-500/20", label: "Pending" },
  downloading: { color: "bg-primary", bgColor: "bg-primary/20", label: "Downloading" },
  completed: { color: "bg-green-500", bgColor: "bg-green-500/20", label: "Completed" },
  error: { color: "bg-red-500", bgColor: "bg-red-500/20", label: "Error" },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        className
      )}
    >
      <span className={cn("status-indicator", config.color)} />
      {label || config.label}
    </span>
  );
}
