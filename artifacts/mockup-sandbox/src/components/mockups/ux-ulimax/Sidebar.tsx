import {
  LayoutDashboard, Briefcase, CheckSquare, Users, CalendarDays,
  ClipboardList, Wrench, BookOpen, Bell, ChevronDown, LogOut,
  Columns3, TrendingUp, Search,
} from "lucide-react";

const primaryNav = [
  { icon: LayoutDashboard, label: "Dashboard", active: false },
  { icon: Briefcase,       label: "Projetos",  active: true,  badge: undefined },
  { icon: CheckSquare,     label: "Tarefas",   active: false, badge: 5 },
  { icon: Columns3,        label: "Kanban",    active: false },
  { icon: Users,           label: "Equipe",    active: false },
];

const secondaryNav = [
  { icon: CalendarDays, label: "Calendário" },
  { icon: ClipboardList, label: "Instalações" },
  { icon: Wrench, label: "Assistência Técnica" },
];

const utilsNav = [
  { icon: Bell, label: "Alertas", badge: 2 },
  { icon: TrendingUp, label: "Produtividade" },
  { icon: BookOpen, label: "Ajuda" },
];

function NavItem({ icon: Icon, label, active, badge }: { icon: React.ElementType; label: string; active?: boolean; badge?: number }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
      ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 font-medium">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
  );
}

export function Sidebar() {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen shadow-sm">
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">Ulimax & Co.</span>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-slate-100">
          <button className="w-full flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-100 transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar...</span>
            <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">⌘K</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1">
          <SectionLabel label="Principal" />
          {primaryNav.map(n => <NavItem key={n.label} {...n} />)}

          <SectionLabel label="Obra" />
          {secondaryNav.map(n => <NavItem key={n.label} {...n} />)}

          <SectionLabel label="Sistema" />
          {utilsNav.map(n => <NavItem key={n.label} {...n} />)}
        </nav>

        <div className="px-3 py-3 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">AF</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-800 truncate">Ana Flavia</p>
              <p className="text-[11px] text-slate-400 truncate">Executora</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-1">Menu lateral reorganizado</h2>
          <p className="text-sm text-slate-500 max-w-xs">Itens agrupados por contexto: Principal, Obra e Sistema. Busca rápida sempre visível no topo.</p>
        </div>
      </main>
    </div>
  );
}
