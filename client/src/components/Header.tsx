import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Header({ title }: { title: string }) {
    const { user, logout } = useAuth();

    return (
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-10">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {title}
            </h1>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="h-9 w-64 rounded-full bg-secondary border border-border pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>

                <button className="relative w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
                </button>

                <div className="h-6 w-px bg-border mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium leading-none">{user?.firstName || 'Admin'}</div>
                        <div className="text-xs text-muted-foreground mt-1">Administrator</div>
                    </div>
                    <button
                        onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            window.location.reload();
                        }}
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-semibold hover:scale-105 active:scale-95 transition-all"
                    >
                        {user?.firstName?.[0] || 'A'}
                    </button>
                </div>
            </div>
        </header>
    );
}
