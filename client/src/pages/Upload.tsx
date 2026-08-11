import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUploadDiagnostics, useStartUploadTest } from "@/hooks/use-diagnostics";
import { insertUploadSchema, type InsertUploadDiagnostics } from "@shared/schema";
import {
  Loader2,
  Play,
  UploadCloud,
  Settings2,
  Activity,
  Timer,
  HardDriveUpload
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

export default function UploadPage() {
  const { data: diagnostics, isLoading } = useUploadDiagnostics(true);
  const startTest = useStartUploadTest();
  const { toast } = useToast();
  const [throughput, setThroughput] = useState<number>(0);

  useEffect(() => {
    console.log("Upload diagnostics data changed:", diagnostics);
    if (diagnostics?.testBytesSent && diagnostics?.bomTime && diagnostics?.eomTime) {
      //const durationSeconds = (new Date(diagnostics.eomTime).getTime() - new Date(diagnostics.bomTime).getTime()) / 1000;
      const durationSeconds = diagnostics.timeBasedTestDuration || 1;
      if (durationSeconds > 0) {
        const mbps = (diagnostics.testBytesSent * 8) / (durationSeconds * 1000);
        setThroughput(Math.round(mbps * 100) / 100);
      }
    } else if (diagnostics?.testBytesSent && diagnostics?.bomTime && diagnostics.diagnosticsState === 'Requested') {
      const durationSeconds = (Date.now() - new Date(diagnostics.bomTime).getTime()) / 1000;
      if (durationSeconds > 0) {
        const mbps = (diagnostics.testBytesSent * 8) / (durationSeconds * 1000000);
        setThroughput(Math.round(mbps * 100) / 100);
      }
    } else {
      setThroughput(0);
    }
  }, [diagnostics]);

  const form = useForm<InsertUploadDiagnostics>({
    resolver: zodResolver(insertUploadSchema),
    defaultValues: {
      uploadUrl: "http://localhost:5000/upload",
      interface: "Device.IP.Interface.1",
      testFileLength: 10485760, // 10MB
      dscp: 0,
      ethernetPriority: 0,
      numberOfConnections: 1,
      timeBasedTestDuration: 0,
      protocolVersion: "Any",
    },
    values: diagnostics ? {
      uploadUrl: diagnostics.uploadUrl,
      interface: diagnostics.interface || "Device.IP.Interface.1",
      testFileLength: diagnostics.testFileLength,
      dscp: diagnostics.dscp || 0,
      ethernetPriority: diagnostics.ethernetPriority || 0,
      numberOfConnections: diagnostics.numberOfConnections || 1,
      timeBasedTestDuration: diagnostics.timeBasedTestDuration || 0,
      protocolVersion: diagnostics.protocolVersion || "Any",
    } : undefined
  });

  const onSubmit = (data: InsertUploadDiagnostics) => {
    startTest.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Test Started",
          description: "Upload diagnostics test has been requested.",
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
          <h2 className="text-3xl font-display font-bold text-foreground">Upload Diagnostics</h2>
          <p className="text-muted-foreground mt-1">Configure and execute HTTP upload throughput tests per TR-143.</p>
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
          variant="accent"
        />
        <MetricCard
          label="Bytes Sent"
          value={diagnostics?.testBytesSent ? (diagnostics.testBytesSent / 1024 / 1024).toFixed(2) : "0"}
          unit="MB"
          icon={HardDriveUpload}
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
              <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Set parameters for the upload test.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="url" className="text-sm font-medium">Upload URL</Label>
                  <Input
                    id="url"
                    placeholder="http://example.com/upload"
                    {...form.register("uploadUrl")}
                    disabled={isRunning}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="fileLength">Test File Length (Bytes)</Label>
                    <Input
                      id="fileLength"
                      type="number"
                      {...form.register("testFileLength", { valueAsNumber: true })}
                      disabled={isRunning}
                    />
                  </div>

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
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isRunning || startTest.isPending}
                  className={cn(
                    "min-w-[150px] font-semibold transition-all duration-200 bg-accent text-accent-foreground hover:bg-accent/90",
                    isRunning ? "opacity-75 cursor-not-allowed" : "shadow-lg shadow-accent/20 hover:shadow-accent/30"
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
                      Start Upload Test
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
                <UploadCloud className="w-4 h-4 text-muted-foreground" />
                Transfer Details
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
                <span className="text-sm text-muted-foreground">Total Bytes Rx</span>
                <span className="text-sm font-mono font-medium">{diagnostics?.totalBytesReceived || "0"}</span>
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
