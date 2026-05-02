import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Map, Bell, User, PlusCircle, LogOut } from "lucide-react";
import { useGetMyPings } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: pings } = useGetMyPings({ query: { enabled: !!user } });

  const pendingCount = pings?.received.filter((p) => p.status === "pending").length || 0;

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-background">
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col justify-between shrink-0">
        <div className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              IH
            </div>
            <span className="font-bold text-xl tracking-tight">I AM HERE</span>
          </Link>

          <div className="flex flex-col gap-2">
            <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}>
              <Map size={20} />
              <span className="font-medium">Map</span>
            </Link>
            
            <Link href="/session/create" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/session/create" ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}>
              <PlusCircle size={20} />
              <span className="font-medium">New Session</span>
            </Link>

            <Link href="/notifications" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/notifications" ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}>
              <div className="relative">
                <Bell size={20} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="font-medium">Pings</span>
            </Link>

            <Link href="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/profile" ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}>
              <User size={20} />
              <span className="font-medium">Profile</span>
            </Link>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </Button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
