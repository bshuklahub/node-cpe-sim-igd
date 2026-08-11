import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Download, 
  Upload, 
  Settings, 
  Power, 
  FileText,
  Zap
} from "lucide-react";

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

const actions = [
  { id: "download", label: "Download File", icon: Download, variant: "default" as const },
  { id: "upload", label: "Upload Config", icon: Upload, variant: "outline" as const },
  { id: "reboot", label: "Reboot", icon: Power, variant: "destructive" as const },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <Card className="glass-pane~l">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                className="h-auto py-3 flex-col gap-1"
                onClick={() => onAction?.(action.id)}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
