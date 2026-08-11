import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let variant = "default";
  let Icon = PlayCircle;
  let label = status;

  if (status === "Requested" || status === "In Progress") {
    variant = "loading";
    Icon = Loader2;
  } else if (status === "Completed") {
    variant = "success";
    Icon = CheckCircle2;
  } else if (status.startsWith("Error")) {
    variant = "error";
    Icon = AlertCircle;
    label = status.replace("Error_", "Error: ");
  } else if (status === "None") {
    variant = "neutral";
    label = "Ready";
  }

  const styles = {
    default: "bg-secondary text-secondary-foreground border-border",
    neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    loading: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    error: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold font-mono uppercase tracking-wider",
      styles[variant as keyof typeof styles],
      className
    )}>
      <Icon className={cn("w-3.5 h-3.5", variant === "loading" && "animate-spin")} />
      {label}
    </div>
  );
}
