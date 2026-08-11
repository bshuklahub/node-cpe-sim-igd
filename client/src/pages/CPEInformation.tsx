import { useState, useEffect } from "react";
import { DeviceInfoPanel } from "@/components/DeviceInfoPanel";
import { DownloadQueue } from "@/components/DownloadQueue";
import { TR069MessageViewer } from "@/components/TR069MessageViewer";
import { ActivityLog } from "@/components/ActivityLog";
import { QuickActions } from "@/components/QuickActions";
import { DownloadConfigForm } from "@/components/DownloadConfigForm";
import { Wifi, Radio } from "lucide-react";
import { useCPEInformation} from "@/hooks/use-cpeinformation";

interface DownloadItem {
  id: string;
  filename: string;
  type: "firmware" | "config" | "package";
  size: string;
  progress: number;
  status: "pending" | "downloading" | "completed" | "error";
  speed?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  details?: string;
}

// Sample data
const mockDevice = {
  manufacturer: "Huawei Technologies",
  model: "HG8245H",
  serialNumber: "48575443A1B2C3D4",
  softwareVersion: "V5R019C00S125",
  hardwareVersion: "168D.A",
  connectionStatus: "online" as const,
  lastContact: "2026-01-17T14:32:45Z",
  ipAddress: "192.168.1.1",
  macAddress: "00:1A:2B:3C:4D:5E",
  uptime: "15d 7h 23m 45s",
};

const mockDownloads: DownloadItem[] = [
  {
    id: "1",
    filename: "firmware_v5r020.bin",
    type: "firmware",
    size: "24.5 MB",
    progress: 67,
    status: "downloading",
    speed: "1.2 MB/s",
  },
  {
    id: "2",
    filename: "device_config.xml",
    type: "config",
    size: "128 KB",
    progress: 0,
    status: "pending",
  },
  {
    id: "3",
    filename: "tr069_client_1.2.0.pkg",
    type: "package",
    size: "8.7 MB",
    progress: 100,
    status: "completed",
  },
];

const mockMessages = [
  {
    id: "1",
    type: "request" as const,
    method: "Download",
    timestamp: "14:32:45",
    body: `CommandKey: "DL001"
FileType: "1 Firmware Upgrade Image"
URL: "https://acs.example.com/firmware/v5r020.bin"
Username: "cpe_user"
FileSize: 25690112`,
  },
  {
    id: "2",
    type: "response" as const,
    method: "DownloadResponse",
    timestamp: "14:32:46",
    body: `Status: 1
StartTime: "2026-01-17T14:32:46Z"
CompleteTime: "0001-01-01T00:00:00Z"`,
  },
  {
    id: "3",
    type: "request" as const,
    method: "TransferComplete",
    timestamp: "14:35:12",
    body: `CommandKey: "DL001"
FaultCode: 0
FaultString: ""
StartTime: "2026-01-17T14:32:46Z"
CompleteTime: "2026-01-17T14:35:12Z"`,
  },
];

const mockLogs: LogEntry[] = [
  { id: "1", timestamp: "14:35:12", level: "success", message: "Download completed", details: "firmware_v5r020.bin" },
  { id: "2", timestamp: "14:32:46", level: "info", message: "Download started", details: "FileType: Firmware" },
  { id: "3", timestamp: "14:32:45", level: "info", message: "Received Download RPC", details: "from ACS" },
  { id: "4", timestamp: "14:30:00", level: "info", message: "Inform sent", details: "Event: CONNECTION REQUEST" },
  { id: "5", timestamp: "14:29:55", level: "warning", message: "Connection request received", details: "IP: 10.0.0.100" },
  { id: "6", timestamp: "14:00:00", level: "info", message: "Periodic Inform", details: "Interval: 1800s" },
  { id: "7", timestamp: "13:55:22", level: "error", message: "Download failed", details: "HTTP 404" },
];

export default function Index() {
  const [downloads, setDownloads] = useState(mockDownloads);
  const [logs, setLogs] = useState(mockLogs);
  const deviceInfp = useCPEInformation();
  console.log(">>>>>> "+JSON.stringify(deviceInfp));
  // Simulate download progress
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads((prev) =>
        prev.map((d) => {
          if (d.status === "downloading" && d.progress < 100) {
            const newProgress = Math.min(d.progress + Math.random() * 5, 100);
            return {
              ...d,
              progress: Math.round(newProgress),
              status: newProgress >= 100 ? "completed" : "downloading",
            };
          }
          return d;
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleStartDownload = (id: string) => {
    setDownloads((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "downloading" as const, speed: "1.5 MB/s" } : d
      )
    );
    addLog("info", "Download started", `File ID: ${id}`);
  };

  const handleCancelDownload = (id: string) => {
    setDownloads((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "error" as const, progress: 0 } : d
      )
    );
    addLog("warning", "Download cancelled", `File ID: ${id}`);
  };

  const handleNewDownload = (config: any) => {
    const filename = config.url.split("/").pop() || "unknown_file";
    const newDownload = {
      id: Date.now().toString(),
      filename,
      type: config.fileType as "firmware" | "config" | "package",
      size: "Unknown",
      progress: 0,
      status: "pending" as const,
    };
    setDownloads((prev) => [newDownload, ...prev]);
    addLog("info", "Download queued", filename);
  };

  const handleQuickAction = (action: string) => {
    addLog("info", `Action executed`, action);
  };

  const addLog = (level: "info" | "success" | "warning" | "error", message: string, details?: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
    const newLog = {
      id: Date.now().toString(),
      timestamp,
      level,
      message,
      details,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Radio className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">TR-069 CPE Manager</h1>
                <p className="text-xs text-muted-foreground">Sample Download Implementation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className="w-4 h-4 text-primary" />
              <span className="font-mono">ACS Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <DeviceInfoPanel device={mockDevice} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
             <ActivityLog entries={logs} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground">
            TR-069 CPE Sample Implementation • CWMP Protocol Reference
          </p>
        </div>
      </footer>
    </div>
  );
}
