import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDownloadDiagnostics, useStartDownloadTest } from "@/hooks/use-diagnostics";
import { insertDownloadSchema, type InsertDownloadDiagnostics } from "@shared/schema";
import {
  Loader2,
  Play,
  Server,
  Settings2,
  Activity,
  Timer,
  HardDriveDownload
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { MetricCard } from "@/components/metric-card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DownloadPage() {
  const { data: diagnostics, isLoading } = useDownloadDiagnostics(true); // Polling enabled
  const startTest = useStartDownloadTest();
  const { toast } = useToast();

  // Calculate throughput manually for display
  const [throughput, setThroughput] = useState<number>(0);

  useEffect(() => {
    console.log("Diagnostics updated:", diagnostics);
    if (diagnostics?.testBytesReceived && diagnostics?.bomTime && diagnostics?.eomTime && diagnostics.diagnosticsState === 'Completed') {
      console.log("Diagnostics Completed");
      // Completed test calculation
      const durationSeconds = diagnostics.timeBasedTestDuration || 1;
      if (durationSeconds > 0) {
        const mbps = (diagnostics.testBytesReceived * 8) / (durationSeconds * 1000);
        setThroughput(Math.round(mbps * 100) / 100);
      }
    } else if (diagnostics?.testBytesReceived && diagnostics?.bomTime && diagnostics.diagnosticsState === 'Requested') {
      console.log("Diagnostics Reqeusted");
      // Live calculation (approximate)
      const durationSeconds = (Date.now() - new Date(diagnostics.bomTime).getTime()) / 1000;
      if (durationSeconds > 0) {
        const mbps = (diagnostics.testBytesReceived * 8) / (durationSeconds * 1000000);
        setThroughput(Math.round(mbps * 100) / 100);
      }
    } else {
      console.log("Diagnostics Not started or no data");
      setThroughput(0);
    }
  }, [diagnostics]);

  const form = useForm<InsertDownloadDiagnostics>({
    resolver: zodResolver(insertDownloadSchema),
    defaultValues: {
      downloadUrl: "http://localhost:5000/download/file1Mb.txt",
      interface: "Device.IP.Interface.1",
      dscp: 0,
      ethernetPriority: 0,
      numberOfConnections: 1,
      timeBasedTestDuration: 0,
      protocolVersion: "Any",
    },
    values: diagnostics ? {
      downloadUrl: diagnostics.downloadUrl,
      interface: diagnostics.interface || "Device.IP.Interface.1",
      dscp: diagnostics.dscp || 0,
      ethernetPriority: diagnostics.ethernetPriority || 0,
      numberOfConnections: diagnostics.numberOfConnections || 1,
      timeBasedTestDuration: diagnostics.timeBasedTestDuration || 0,
      protocolVersion: diagnostics.protocolVersion || "Any",
    } : undefined
  });

  const onSubmit = (data: InsertDownloadDiagnostics) => {

    startTest.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Test Started",
          description: "Download diagnostics test has been requested.",
        });
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const isRunning = diagnostics?.diagnosticsState === "Requested";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Download Diagnostics</h2>
          <p className="text-muted-foreground mt-1">Configure and execute HTTP download throughput tests per TR-143.</p>
        </div>
        <StatusBadge status={diagnostics?.diagnosticsState || "None"} className="text-sm px-4 py-2" />
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Throughput"
          value={throughput}
          unit="Mbps"
          icon={Activity}
          variant="primary"
        />
        <MetricCard
          label="Bytes Received"
          value={diagnostics?.testBytesReceived ? (diagnostics.testBytesReceived / 1024 / 1024).toFixed(2) : "0"}
          unit="MB"
          icon={HardDriveDownload}
        />
        <MetricCard
          label="BOM Time"
          value={diagnostics?.bomTime ? format(new Date(diagnostics.bomTime), "HH:mm:ss") : "--"}
          subValue={diagnostics?.bomTime ? format(new Date(diagnostics.bomTime), "MMM d, yyyy") : undefined}
          icon={Timer}
        />
        <MetricCard
          label="EOM Time"
          value={diagnostics?.eomTime ? format(new Date(diagnostics.eomTime), "HH:mm:ss") : "--"}
          subValue={diagnostics?.eomTime ? format(new Date(diagnostics.eomTime), "MMM d, yyyy") : undefined}
          icon={Timer}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <Card className="lg:col-span-2 border-border/60 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Set parameters for the download test.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="url" className="text-sm font-medium">Download URL</Label>
                  <Input
                    id="url"
                    placeholder="http://localhost:5000/download/file1Mb.txt"
                    {...form.register("downloadUrl")}
                    disabled={isRunning}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The HTTP URL of the file to download.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="interface">Interface</Label>
                    <Input
                      id="interface"
                      {...form.register("interface")}
                      disabled={isRunning}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="connections">Number of Connections</Label>
                    <Input
                      id="connections"
                      type="number"
                      {...form.register("numberOfConnections", { valueAsNumber: true })}
                      disabled={isRunning}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dscp">DSCP</Label>
                    <Input
                      id="dscp"
                      type="number"
                      {...form.register("dscp", { valueAsNumber: true })}
                      disabled={isRunning}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Ethernet Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      {...form.register("ethernetPriority", { valueAsNumber: true })}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isRunning || startTest.isPending}
                  className={cn(
                    "min-w-[150px] font-semibold transition-all duration-200",
                    isRunning ? "opacity-75 cursor-not-allowed" : "shadow-lg shadow-primary/20 hover:shadow-primary/30"
                  )}
                >
                  {startTest.isPending || isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isRunning ? "Running Test..." : "Starting..."}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      Start Download Test
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Detailed Stats / Info */}
        <div className="space-y-6">
          <Card className="bg-slate-50 dark:bg-slate-900/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                Connection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">Protocol</span>
                <span className="text-sm font-mono font-medium">{diagnostics?.protocolVersion || "IPv4"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">TCP Open Req</span>
                <span className="text-sm font-mono font-medium">{diagnostics?.tcpOpenRequestTime ? format(new Date(diagnostics.tcpOpenRequestTime), "HH:mm:ss.SSS") : "--"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">TCP Open Resp</span>
                <span className="text-sm font-mono font-medium">{diagnostics?.tcpOpenResponseTime ? format(new Date(diagnostics.tcpOpenResponseTime), "HH:mm:ss.SSS") : "--"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">ROM Time</span>
                <span className="text-sm font-mono font-medium">{diagnostics?.romTime ? format(new Date(diagnostics.romTime), "HH:mm:ss.SSS") : "--"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
