import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Link, FileType, Key } from "lucide-react";

interface DownloadConfig {
  url: string;
  fileType: string;
  username: string;
  password: string;
  targetPath: string;
}

interface DownloadConfigFormProps {
  onSubmit?: (config: DownloadConfig) => void;
}

export function DownloadConfigForm({ onSubmit }: DownloadConfigFormProps) {
  const [config, setConfig] = useState<DownloadConfig>({
    url: "",
    fileType: "firmware",
    username: "",
    password: "",
    targetPath: "/tmp/download/",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(config);
  };

  return (
    <Card className="glass-panel glow-teal">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          New Download Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-xs flex items-center gap-1.5">
              <Link className="w-3 h-3" /> Download URL
            </Label>
            <Input
              id="url"
              placeholder="https://firmware.example.com/update.bin"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fileType" className="text-xs flex items-center gap-1.5">
                <FileType className="w-3 h-3" /> File Type
              </Label>
              <Select
                value={config.fileType}
                onValueChange={(value) => setConfig({ ...config, fileType: value })}
              >
                <SelectTrigger id="fileType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firmware">Firmware Image</SelectItem>
                  <SelectItem value="config">Configuration File</SelectItem>
                  <SelectItem value="package">Software Package</SelectItem>
                  <SelectItem value="log">Log File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetPath" className="text-xs">Target Path</Label>
              <Input
                id="targetPath"
                placeholder="/tmp/download/"
                value={config.targetPath}
                onChange={(e) => setConfig({ ...config, targetPath: e.target.value })}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Key className="w-3 h-3" /> Authentication (Optional)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Username"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Queue Download
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
