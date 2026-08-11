import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Cpu, HardDrive, Wifi, Clock, Server } from "lucide-react";

interface DeviceInfo {
  manufacturer: string;
  model: string;
  serialNumber: string;
  softwareVersion: string;
  hardwareVersion: string;
  connectionStatus: "online" | "offline";
  lastContact: string;
  ipAddress: string;
  macAddress: string;
  uptime: string;
}

interface DeviceInfoPanelProps {
  device: DeviceInfo;
}

export function DeviceInfoPanel({ device }: DeviceInfoPanelProps) {
 console.log("DeviceInfoPanel "+device);
  return (
    <Card className="glass-panel glow-teal">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          CPE Device Information
        </CardTitle>
        <StatusBadge status={device.connectionStatus} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow icon={Cpu} label="Manufacturer" value={device.manufacturer} />
          <InfoRow icon={HardDrive} label="Model" value={device.model} />
          <InfoRow label="Serial Number" value={device.serialNumber} mono />
          <InfoRow label="Software Version" value={device.softwareVersion} mono />
          <InfoRow label="Hardware Version" value={device.hardwareVersion} mono />
          <InfoRow icon={Wifi} label="IP Address" value={device.ipAddress} mono />
          <InfoRow label="MAC Address" value={device.macAddress} mono />
          <InfoRow icon={Clock} label="Uptime" value={device.uptime} />
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Last Contact: <span className="font-mono text-foreground">{device.lastContact}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ 
  icon: Icon, 
  label, 
  value, 
  mono = false 
}: { 
  icon?: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string; 
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className={mono ? "font-mono text-sm" : "text-sm font-medium"}>{value}</p>
    </div>
  );
}
