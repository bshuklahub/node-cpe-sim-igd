import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border/50 shadow-lg hover:border-primary/20 hover:shadow-primary/5 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trendUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          }`}>
            {trend}
          </span>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
