import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users, 
  Settings,
  HardHat,
  Columns3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: Briefcase },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/kanban", label: "Kanban", icon: Columns3 },
    { href: "/members", label: "Team", icon: Users },
  ];

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex h-screen w-full bg-muted/30">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-border/50">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
              <HardHat className="h-6 w-6" />
              <span>ULIMAX</span>
            </Link>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">
              Menu
            </div>
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
              <Settings className="h-4 w-4" />
              Settings
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-16 border-b bg-card flex items-center px-6 shrink-0 md:hidden">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
              <HardHat className="h-6 w-6" />
              <span>ULIMAX</span>
            </Link>
          </header>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
