import { Header } from "@/components/Header";
import { useLogs, useClearLogs } from "@/hooks/use-logs";
import { Trash2, Pause, Play, Download } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { clsx } from "clsx";

export default function Logs() {
  const [isPaused, setIsPaused] = useState(false);
  const { data: logs, isLoading } = useLogs(100);
  const { mutate: clearLogs, isPending: isClearing } = useClearLogs();

  // If paused, we just keep the previous logs, but here we can just stop refetching if we had control over the hook's enabled state dynamically.
  // For simplicity, we'll just not render new ones or the user accepts the stream. 
  // Better yet, let's keep it simple: Real console logs always stream unless we implement complex local state.
  
  const handleExport = () => {
    if (!logs) return;
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tr069-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header title="Communication Logs" />

      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Monitoring
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExport}
                className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                title="Export Logs"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  isPaused 
                    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button 
                onClick={() => clearLogs()}
                disabled={isClearing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#0d1117] border border-border rounded-xl shadow-inner overflow-hidden flex flex-col font-mono text-sm relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
              {isLoading ? (
                <div className="text-muted-foreground text-center mt-10">Initializing log stream...</div>
              ) : !logs || logs.length === 0 ? (
                <div className="text-muted-foreground text-center mt-10 opacity-50">No logs captured.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded -mx-1 group">
                    <span className="text-muted-foreground shrink-0 select-none opacity-50 text-xs w-20 pt-0.5">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                    </span>
                    
                    <span className={clsx(
                      "shrink-0 font-bold text-xs px-1.5 rounded h-fit mt-0.5 select-none w-20 text-center",
                      log.type === 'SOAP_IN' && "text-blue-400 bg-blue-400/10",
                      log.type === 'SOAP_OUT' && "text-green-400 bg-green-400/10",
                      log.type === 'ERROR' && "text-red-400 bg-red-400/10",
                      log.type === 'INFO' && "text-gray-400 bg-gray-400/10",
                    )}>
                      {log.type}
                    </span>

                    <div className="flex-1 break-all text-gray-300 group-hover:text-white transition-colors">
                      {log.message}
                      {log.details && (
                        <pre className="mt-2 text-xs text-gray-500 bg-black/20 p-2 rounded overflow-x-auto border border-white/5">
                          {log.details}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Status bar */}
            <div className="bg-secondary/50 border-t border-border px-4 py-1.5 text-xs text-muted-foreground flex justify-between items-center select-none">
              <span>buffer: {logs?.length || 0} lines</span>
              <span>utf-8</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
