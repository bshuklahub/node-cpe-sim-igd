import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./StatusBadge";
import { Download, FileCode, Package, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadItem {
  id: string;
  filename: string;
  type: "firmware" | "config" | "package";
  size: string;
  progress: number;
  status: "pending" | "downloading" | "completed" | "error";
  speed?: string;
}

interface DownloadQueueProps {
  items: DownloadItem[];
  onStartDownload?: (id: string) => void;
  onCancelDownload?: (id: string) => void;
}

const typeIcons = {
  firmware: FileCode,
  config: Settings,
  package: Package,
};

export function DownloadQueue({ items, onStartDownload, onCancelDownload }: DownloadQueueProps) {
  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Download Queue
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {items.filter(i => i.status === "downloading").length} active
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const Icon = typeIcons[item.type];
          return (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium font-mono">{item.filename}</p>
                    <p className="text-xs text-muted-foreground">{item.size}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
              
              {(item.status === "downloading" || item.status === "pending") && (
                <div className="space-y-1">
                  <Progress 
                    value={item.progress} 
                    className="h-1.5"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.progress}%</span>
                    {item.speed && <span>{item.speed}</span>}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                {item.status === "pending" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs h-7"
                    onClick={() => onStartDownload?.(item.id)}
                  >
                    Start Download
                  </Button>
                )}
                {item.status === "downloading" && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="text-xs h-7"
                    onClick={() => onCancelDownload?.(item.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No downloads in queue
          </p>
        )}
      </CardContent>
    </Card>
  );
}
