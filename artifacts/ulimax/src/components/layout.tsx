import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users,
  Columns3,
  CalendarDays,
  LogOut,
  ChevronDown,
  ClipboardList,
  Wrench,
  FlaskConical,
  BookOpen,
  Search,
  GanttChartSquare,
  History,
  Sun,
  Clock,
  Sparkles,
  Layers,
  Zap,
  BarChart3,
  Settings2,
  Package,
  Menu,
  Presentation,
  TrendingUp,
  HardHat,
  ClipboardCheck,
  CalendarClock,
  Eye,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useClerk, useUser } from "@clerk/react";
import { useAppUser } from "@/hooks/useAppUser";
import { useEffectiveRole, useIsRealGestor, useViewAs, setViewAs, type SystemRole } from "@/hooks/useViewAs";
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
import { NotificationBell } from "@/components/notification-bell";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { CommandPalette } from "@/components/command-palette";
import { TourGuide, openTour } from "@/components/tour-guide";
import { QuickCreate } from "@/components/quick-create";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { useRecentProjects } from "@/hooks/useRecentProjects";
import { NavHelpPopover } from "@/components/nav-help";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: me } = useAppUser();
  const realRole = me?.role as "gestor" | "gestor_obras" | "executor" | "observador" | undefined;
  // Papel efetivo: quando um gestor usa "Ver como", o menu e o acesso passam a
  // ser os do papel escolhido (só apresentação — o servidor não muda).
  const role = useEffectiveRole() ?? realRole;
  const isRealGestor = useIsRealGestor();
  const viewAs = useViewAs();
  const VIEW_AS_LABELS: Record<SystemRole, string> = {
    gestor: "Gestor (você)",
    gestor_obras: "Gestor de Obras",
    executor: "Projetista",
    observador: "Observador",
  };
  const alertCounts = useAlertCounts();
  const recentProjects = useRecentProjects();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number; badgeDanger?: boolean; highlight?: boolean };

  const dashboardItem: NavItem = {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    badge: alertCounts.total > 0 ? alertCounts.total : undefined,
    badgeDanger: alertCounts.danger > 0,
  };

  const navGroups: { label: string; items: NavItem[] }[] =
    role === "executor"
      ? [
          {
            label: "Principal",
            items: [
              { href: "/meu-dia", label: "Meu Dia", icon: Sun, highlight: true },
              { href: "/tasks", label: "Tarefas", icon: CheckSquare },
              { href: "/kanban", label: "Kanban", icon: Columns3 },
              { href: "/projects", label: "Projetos", icon: Briefcase },
            ],
          },
          {
            label: "Obra",
            items: [
              { href: "/checklist", label: "Instalações", icon: ClipboardList },
              { href: "/calendario", label: "Calendário", icon: CalendarDays },
            ],
          },
          {
            label: "Sistema",
            items: [{ href: "/ajuda", label: "Ajuda", icon: BookOpen }],
          },
        ]
      : role === "gestor_obras"
        ? [
            {
              label: "Principal",
              items: [
                { href: "/obra", label: "Central da Obra", icon: HardHat, highlight: true },
                { href: "/cobrancas", label: "Minhas Cobranças", icon: ClipboardCheck },
                { href: "/agenda", label: "Agenda de Obra", icon: CalendarClock },
                { href: "/meu-dia", label: "Meu Dia", icon: Sun },
                { href: "/portfolio", label: "Painel de Projetos", icon: BarChart3 },
                { href: "/projects", label: "Projetos", icon: Briefcase },
                { href: "/tasks", label: "Tarefas", icon: CheckSquare },
                { href: "/kanban", label: "Kanban", icon: Columns3 },
              ],
            },
            {
              label: "Obra",
              items: [
                { href: "/checklist", label: "Instalações", icon: ClipboardList },
                { href: "/calendario", label: "Calendário", icon: CalendarDays },
              ],
            },
            {
              label: "Sistema",
              items: [{ href: "/ajuda", label: "Ajuda", icon: BookOpen }],
            },
          ]
      : role === "observador"
        ? [
            {
              label: "Principal",
              items: [
                dashboardItem,
                { href: "/portfolio", label: "Painel de Projetos", icon: BarChart3 },
                { href: "/projects", label: "Projetos", icon: Briefcase },
                { href: "/calendario", label: "Calendário", icon: CalendarDays },
              ],
            },
            {
              label: "Sistema",
              items: [{ href: "/ajuda", label: "Ajuda", icon: BookOpen }],
            },
          ]
        : role === "gestor"
          ? [
              {
                label: "Principal",
                items: [
                  { href: "/meu-dia", label: "Meu Dia", icon: Sun, highlight: true },
                  dashboardItem,
                  { href: "/portfolio", label: "Painel de Projetos", icon: BarChart3 },
                  { href: "/projects", label: "Projetos", icon: Briefcase },
                  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
                  { href: "/kanban", label: "Kanban", icon: Columns3 },
                ],
              },
              {
                label: "Obra",
                items: [
                  { href: "/obra", label: "Central da Obra", icon: HardHat },
                  { href: "/cobrancas", label: "Minhas Cobranças", icon: ClipboardCheck },
                  { href: "/agenda", label: "Agenda de Obra", icon: CalendarClock },
                  { href: "/checklist", label: "Instalações", icon: ClipboardList },
                  { href: "/calendario", label: "Calendário", icon: CalendarDays },
                ],
              },
              {
                label: "Análises",
                items: [
                  { href: "/assistente", label: "Assistente", icon: Sparkles },
                  { href: "/reuniao", label: "Reunião Semanal", icon: Presentation },
                  { href: "/desempenho", label: "Desempenho", icon: TrendingUp },
                ],
              },
              {
                label: "Configurações",
                items: [
                  { href: "/members", label: "Equipe", icon: Users },
                  { href: "/templates", label: "Templates", icon: Layers },
                  { href: "/campos-personalizados", label: "Campos Personalizados", icon: Settings2 },
                  { href: "/automacao", label: "Automações", icon: Zap },
                  { href: "/auditoria", label: "Auditoria", icon: History },
                ],
              },
              {
                label: "Sistema",
                items: [{ href: "/ajuda", label: "Ajuda", icon: BookOpen }],
              },
            ]
          : [];

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
      <div className="flex h-dvh w-full bg-muted/30 print:h-auto print:block print:bg-white">
        {/* Sidebar */}
        <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col hidden md:flex shrink-0 print:hidden">
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <Link href="/" className="flex items-center">
              <img src="/logo-ulimax.png" alt="Ulimax & Co." className="h-6 brightness-0 invert" />
            </Link>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest px-2 py-1.5">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href.length > 1 && location.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                          isActive
                            ? item.highlight
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                              : "bg-sidebar-primary/15 text-sidebar-primary"
                            : item.highlight
                              ? "bg-amber-50 text-amber-700 border border-amber-200/70 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40 dark:hover:bg-amber-900/40"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", item.highlight && !isActive && "text-amber-500")} />
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
                        <NavHelpPopover href={item.href} label={item.label} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Recent projects */}
          {recentProjects.length > 0 && (
            <div className="px-3 pb-2 border-t border-sidebar-border/50 pt-2">
              <div className="text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest px-2 py-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Recentes
              </div>
              {recentProjects.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                    location === `/projects/${p.id}`
                      ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                      : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}>
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {/* User section at the bottom */}
          <div className="px-4 pb-2 flex items-center gap-1">
            <NotificationBell />
            <DarkModeToggle />
            <button
              onClick={() => {
                const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                document.dispatchEvent(ev);
              }}
              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer border border-sidebar-border/40"
              title="Busca global (⌘K)"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left hidden lg:block">Buscar...</span>
              <kbd className="text-[10px] bg-sidebar-border/30 px-1 rounded hidden lg:block">⌘K</kbd>
            </button>
          </div>
          <button
            onClick={openTour}
            className="mx-3 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer w-[calc(100%-1.5rem)]"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Tour rápido
          </button>
          <TourGuide />
          <CommandPalette />
          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center text-sidebar-primary font-semibold text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sidebar-foreground text-xs truncate">{displayName}</p>
                    <p className="text-sidebar-foreground/50 text-[11px] truncate">{user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                </div>
                {isRealGestor && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ver como (pré-visualização)
                    </div>
                    {(["gestor", "gestor_obras", "executor", "observador"] as SystemRole[]).map((r) => {
                      const active = (viewAs ?? "gestor") === r;
                      return (
                        <DropdownMenuItem
                          key={r}
                          className="cursor-pointer"
                          onClick={() => setViewAs(r === "gestor" ? null : r)}
                        >
                          <Eye className={cn("mr-2 h-4 w-4", active ? "text-primary" : "text-muted-foreground/50")} />
                          <span className={cn(active && "font-semibold text-primary")}>{VIEW_AS_LABELS[r]}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
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
        <main className="flex-1 flex flex-col h-full overflow-hidden print:h-auto print:overflow-visible print:block">
          {isRealGestor && viewAs && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm print:hidden dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                Pré-visualizando como <strong>{VIEW_AS_LABELS[viewAs]}</strong> — você continua com acesso de gestor; isto muda apenas o menu e as telas visíveis.
              </span>
              <button
                onClick={() => setViewAs(null)}
                className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
              >
                Voltar para Gestor
              </button>
            </div>
          )}
          {/* Desktop topbar — breadcrumb + search + quick create */}
          <header className="h-12 border-b bg-card/80 backdrop-blur-sm items-center px-6 shrink-0 hidden md:flex gap-4 print:hidden">
            <div className="flex-1 min-w-0">
              <BreadcrumbNav />
            </div>
            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/60 border border-border/50 hover:bg-muted text-muted-foreground transition-colors cursor-pointer w-72 shrink-0 text-sm"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <span className="flex-1 text-left text-sm text-muted-foreground/70">Buscar...</span>
              <kbd className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono shrink-0">⌘K</kbd>
            </button>
            <QuickCreate />
          </header>
          {/* Mobile header */}
          <header className="h-14 border-b bg-card flex items-center justify-between px-3 shrink-0 md:hidden print:hidden">
            <div className="flex items-center gap-1.5">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors"
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col">
                  <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                  <div className="h-14 flex items-center px-4 border-b shrink-0">
                    <img src="/logo-ulimax.png" alt="Ulimax & Co." className="h-6" />
                  </div>
                  <nav className="flex-1 overflow-y-auto py-3 px-3">
                    {navGroups.map((group) => (
                      <div key={group.label} className="mb-2">
                        <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 py-1.5">
                          {group.label}
                        </div>
                        {group.items.map((item) => {
                          const isActive = location === item.href || (item.href.length > 1 && location.startsWith(item.href));
                          const Icon = item.icon;
                          return (
                            <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)}>
                              <div
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground/70 hover:bg-muted"
                                )}
                              >
                                <Icon className={cn("h-4 w-4 shrink-0", item.highlight && !isActive && "text-amber-500")} />
                                <span className="flex-1">{item.label}</span>
                                {item.badge !== undefined && (
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none",
                                      item.badgeDanger ? "bg-red-500 text-white" : "bg-amber-400 text-amber-900"
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </nav>
                  <div className="border-t p-3 space-y-1 shrink-0">
                    <div className="px-3 pb-1">
                      <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.emailAddresses?.[0]?.emailAddress ?? ""}</p>
                    </div>
                    <button
                      onClick={() => { setMobileNavOpen(false); openTour(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Sparkles className="h-4 w-4" /> Tour rápido
                    </button>
                    <button
                      onClick={() => signOut({ redirectUrl: basePath || "/" })}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
              <Link href="/" className="flex items-center">
                <img src="/logo-ulimax.png" alt="Ulimax & Co." className="h-6" />
              </Link>
            </div>
            <div className="flex items-center gap-0.5">
              <NotificationBell />
              <DarkModeToggle />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible print:p-0">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
