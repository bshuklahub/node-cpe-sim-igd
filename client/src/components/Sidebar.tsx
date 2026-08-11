import { Link, useLocation } from "wouter";
import { LayoutDashboard, Database, Settings, Terminal, Radio, UploadCloud, BookAIcon, BellRing, CircleGauge } from "lucide-react";
import { clsx } from "clsx";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parameters", label: "Parameters", icon: Database },
    { href: "/notifications", label: "Notifications", icon: BellRing },
    { href: "/logs", label: "Logs", icon: Terminal },
    { href: "/settings", label: "Configuration", icon: Settings },
    { href: "/fileManager", label: "File Manager", icon: UploadCloud },
    { href: "/cpeInformation", label: "CPE Details", icon: BookAIcon },
    { href: "/diagnostics", label: "Diagnostics", icon: CircleGauge },

  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col shadow-2xl z-20">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Radio className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">TR-069</h1>
            <span className="text-xs text-muted-foreground font-mono">CPE SIMULATOR</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-3px_rgba(14,165,233,0.3)]"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
              )}
              <Icon className={clsx("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-secondary/50 rounded-lg p-3 text-xs font-mono text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>Status</span>
            <span className="text-green-500 font-bold">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span>Uptime</span>
            <span>12d 4h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
