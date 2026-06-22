import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users,
  HardHat,
  Columns3,
  CalendarDays,
  LogOut,
  ChevronDown,
  Bell,
  ClipboardList,
  Wrench,
  FlaskConical,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useIsGestor } from "@/hooks/useAppUser";
import { useAlertCounts } from "@/hooks/useAlerts";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isGestor = useIsGestor();
  const alertCounts = useAlertCounts();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projetos", icon: Briefcase },
    { href: "/tasks", label: "Tarefas", icon: CheckSquare },
    { href: "/kanban", label: "Kanban", icon: Columns3 },
    { href: "/checklist", label: "Instalações", icon: ClipboardList },
    { href: "/members", label: "Equipe", icon: Users },
    { href: "/calendario", label: "Calendário Instalação", icon: CalendarDays },
    { href: "/assistencia-tecnica", label: "Assistência Técnica", icon: Wrench },
    { href: "/controle-amostras", label: "Controle de Amostras", icon: FlaskConical },
    { href: "/alertas", label: "Alertas", icon: Bell, badge: alertCounts.total > 0 ? alertCounts.total : undefined, badgeDanger: alertCounts.danger > 0 },
  ] as { href: string; label: string; icon: React.ElementType; badge?: number; badgeDanger?: boolean }[];

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.firstName
      ? user.firstName[0].toUpperCase()
      : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U";

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.emailAddresses?.[0]?.emailAddress ?? "Usuário";

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
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none",
                        item.badgeDanger
                          ? "bg-red-500 text-white"
                          : "bg-amber-400 text-amber-900"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
          
          {/* User section at the bottom */}
          <div className="p-3 border-t border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-muted cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-foreground text-xs truncate">{displayName}</p>
                    <p className="text-muted-foreground text-[11px] truncate">{user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 md:hidden">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
              <HardHat className="h-6 w-6" />
              <span>ULIMAX</span>
            </Link>
            <button
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
