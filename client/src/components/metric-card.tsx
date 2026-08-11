import { cn } from "@/lib/utils";
import { Divide } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon?: React.ElementType;
  subValue?: string;
  variant?: "default" | "primary" | "accent";
  className?: string;
}

export function MetricCard({ 
  label, 
  value, 
  unit, 
  icon: Icon, 
  subValue,
  variant = "default",
  className 
}: MetricCardProps) {
  
  const variants = {
    default: "bg-card border-border/50 hover:border-border",
    primary: "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20",
    accent: "bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20",
  };

  return (
    <div className={cn(
      "p-6 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md",
      variants[variant],
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={cn(
            "p-2 rounded-lg",
            variant === "primary" ? "bg-primary/10 text-primary" : 
            variant === "accent" ? "bg-accent/10 text-accent" :
            "bg-secondary text-foreground"
          )}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "text-3xl font-bold tracking-tight font-display",
            !value && "text-muted-foreground/40"
          )}>
            {value ?? "--"}
          </span>
          {unit && value && (
            <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>
          )}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground font-mono">{subValue}</p>
        )}
      </div>
    </div>
  );
}
