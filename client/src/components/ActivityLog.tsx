import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LogLevel = "info" | "success" | "warning" | "error";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

interface ActivityLogProps {
  entries: LogEntry[];
}

const levelConfig: Record<LogLevel, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  info: { icon: Info, className: "log-info" },
  success: { icon: CheckCircle, className: "log-success" },
  warning: { icon: AlertTriangle, className: "log-warning" },
  error: { icon: XCircle, className: "log-error" },
};

export function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px]">
          <div className="space-y-1">
            {entries.map((entry) => {
              const config = levelConfig[entry.level];
              const Icon = config.icon;
              
              return (
                <div
                  key={entry.id}
                  className="log-entry flex items-start gap-2"
                >
                  <span className="font-mono text-muted-foreground shrink-0">
                    {entry.timestamp}
                  </span>
                  <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", config.className)} />
                  <span className={config.className}>{entry.message}</span>
                  {entry.details && (
                    <span className="text-muted-foreground ml-1">- {entry.details}</span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
