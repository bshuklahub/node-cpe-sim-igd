import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { Activity, Server, Clock, Wifi, Play, RefreshCw, AlertCircle } from "lucide-react";
import { useParameters } from "@/hooks/use-parameters";
import { useLogs } from "@/hooks/use-logs";
import { useInform } from "@/hooks/use-simulation";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
const DEVICE_TR069_DATA_MODEL_TYPE = "InternetGatewayDevice";
export default function Dashboard() {
  const { data: parameters } = useParameters();
  const { data: logs } = useLogs(5); // Last 5 logs
  const { mutate: triggerInform, isPending: isInforming } = useInform();
  const { toast } = useToast();

  // Derived stats
  const serialNumber = parameters?.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.SerialNumber")?.value || "Unknown";
  const softwareVersion = parameters?.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.SoftwareVersion")?.value || "v0.0.0";
  const upTime = parameters?.find(p => p.name === DEVICE_TR069_DATA_MODEL_TYPE + ".DeviceInfo.UpTime")?.value || "0";
  const status = "Active";

  const handleInform = () => {
    triggerInform("2 PERIODIC", {
      onSuccess: (data) => {
        toast({
          title: "Inform Triggered",
          description: data.message,
        });
      },
      onError: (err) => {
        toast({
          title: "Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleCRInform = () => {
    triggerInform("7 CONNECTION REQUEST", {
      onSuccess: (data) => {
        toast({
          title: "Inform Triggered",
          description: data.message,
        });
      },
      onError: (err) => {
        toast({
          title: "Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleBootInform = () => {
    triggerInform("1 BOOT", {
      onSuccess: (data) => {
        toast({
          title: "Inform Triggered",
          description: data.message,
        });
      },
      onError: (err) => {
        toast({
          title: "Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleBootstrapInform = () => {
    triggerInform("0 BOOTSTRAP", {
      onSuccess: (data) => {
        toast({
          title: "Inform Triggered",
          description: data.message,
        });
      },
      onError: (err) => {
        toast({
          title: "Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header title="System Overview" />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Quick Actions & Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Simulator Status</h2>
              <p className="text-muted-foreground">Real-time device simulation metrics</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
               <button 
                onClick={handleBootstrapInform}
                disabled={isInforming}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInforming ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Trigger Bootstrap Inform
              </button>
              <button 
                onClick={handleBootInform}
                disabled={isInforming}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInforming ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Trigger Boot Inform
              </button>
              <button 
                onClick={handleCRInform}
                disabled={isInforming}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInforming ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Trigger CR Inform
              </button>
              <button 
                onClick={handleInform}
                disabled={isInforming}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInforming ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Trigger Inform
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              label="Device Status" 
              value={status} 
              icon={Activity} 
              trend="Normal" 
              trendUp={true} 
            />
            <StatCard 
              label="Serial Number" 
              value={serialNumber} 
              icon={Server} 
            />
            <StatCard 
              label="Uptime (Sec)" 
              value={upTime} 
              icon={Clock} 
            />
            <StatCard 
              label="Firmware" 
              value={softwareVersion} 
              icon={Wifi} 
              trend="Latest"
              trendUp={true}
            />
          </div>

          {/* Recent Activity / Logs Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">Recent Protocol Activity</h3>
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">LIVE</span>
              </div>
              <div className="p-0">
                {logs && logs.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {logs.map((log) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={log.id} 
                        className="p-4 flex gap-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                          log.type === 'ERROR' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                          log.type === 'SOAP_IN' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 
                          log.type === 'SOAP_OUT' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                          'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded border ${
                              log.type === 'ERROR' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                              log.type === 'SOAP_IN' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                              log.type === 'SOAP_OUT' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                              'border-gray-500/30 text-gray-400 bg-gray-500/10'
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/90 font-mono truncate">{log.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No activity recorded yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                 <AlertCircle className="w-5 h-5 text-primary" />
                 <h3 className="font-semibold text-lg">System Health</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="font-mono">42%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[42%]" />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">CPU Load</span>
                    <span className="font-mono">15%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[15%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-mono">68%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 w-[68%]" />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-sm font-medium mb-3">Active Services</h4>
                <div className="flex flex-wrap gap-2">
                   <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">CWMP</span>
                   <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">HTTP</span>
                   <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">DHCP</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
