import { Link } from "wouter";
import { AlertTriangle, AlertCircle, Info, Calendar, CheckSquare, Briefcase, Clock, UserX, ArrowRight, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts, useAlertCounts } from "@/hooks/useAlerts";
import type { Alert, AlertSeverity, AlertType } from "@/hooks/useAlerts";

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; icon: string; badge: string }> = {
  danger:  { border: "border-red-200 dark:border-red-800",    bg: "bg-red-50 dark:bg-red-950/30",    icon: "text-red-600",    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  warning: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-600", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  info:    { border: "border-blue-200 dark:border-blue-800",   bg: "bg-blue-50 dark:bg-blue-950/30",   icon: "text-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
};

const TYPE_META: Record<AlertType, { label: string; icon: React.ElementType }> = {
  overdue_installation:    { label: "Instalação Atrasada",    icon: Calendar },
  approaching_installation: { label: "Instalação Próxima",   icon: Calendar },
  overdue_task:            { label: "Tarefa Atrasada",        icon: CheckSquare },
  no_installation_date:    { label: "Sem Data de Instalação", icon: Info },
  stalled_project:         { label: "Projeto Parado",         icon: Clock },
  no_assignee:             { label: "Sem Responsável",        icon: UserX },
  task_assigned_to_me:     { label: "Minha Tarefa",           icon: HardHat },
};

function SeverityIcon({ severity, className }: { severity: AlertSeverity; className?: string }) {
  const cls = cn(SEVERITY_STYLES[severity].icon, className);
  if (severity === "danger")  return <AlertCircle className={cls} />;
  if (severity === "warning") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function AlertCard({ alert }: { alert: Alert }) {
  const s = SEVERITY_STYLES[alert.severity];
  const meta = TYPE_META[alert.type];
  const Icon = meta.icon;

  return (
    <Link href={alert.href}>
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-shadow hover:shadow-sm",
        s.bg, s.border
      )}>
        <SeverityIcon severity={alert.severity} className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1", s.badge)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

function Section({ title, icon: Icon, alerts, color }: {
  title: string;
  icon: React.ElementType;
  alerts: Alert[];
  color: string;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className={cn("flex items-center gap-2 text-sm font-semibold", color)}>
        <Icon className="h-4 w-4" />
        {title}
        <span className="ml-1 text-xs font-normal text-muted-foreground">({alerts.length})</span>
      </div>
      {alerts.map((a) => <AlertCard key={a.id} alert={a} />)}
    </div>
  );
}

export default function Alertas() {
  const alerts  = useAlerts();
  const { myTasks } = useAlertCounts();
  const myTaskAlerts = alerts.filter((a) => a.type === "task_assigned_to_me");
  const danger  = alerts.filter((a) => a.severity === "danger");
  const warning = alerts.filter((a) => a.severity === "warning");
  const info    = alerts.filter((a) => a.severity === "info" && a.type !== "task_assigned_to_me");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Atrasos, atenções e pendências detectadas automaticamente.
        </p>
      </div>

      {alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">Tudo em ordem!</p>
            <p className="text-sm mt-1">Nenhum alerta pendente no momento.</p>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Minhas Tarefas", count: myTasks,        color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30",  border: "border-violet-200 dark:border-violet-800" },
            { label: "Críticos",       count: danger.length,  color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30",        border: "border-red-200 dark:border-red-800" },
            { label: "Atenção",        count: warning.length, color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30",    border: "border-amber-200 dark:border-amber-800" },
            { label: "Informativos",   count: info.length,    color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",      border: "border-blue-200 dark:border-blue-800" },
          ].map(({ label, count, color, bg, border }) => (
            <div key={label} className={cn("rounded-lg border p-4 text-center", bg, border)}>
              <p className={cn("text-2xl font-bold", color)}>{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <Section title="Minhas Tarefas" icon={HardHat} alerts={myTaskAlerts} color="text-violet-600" />
        <Section title="Críticos"       icon={AlertCircle}  alerts={danger}   color="text-red-600" />
        <Section title="Atenção"        icon={AlertTriangle} alerts={warning} color="text-amber-600" />
        <Section title="Informativos"   icon={Info}          alerts={info}    color="text-blue-500" />
      </div>
    </div>
  );
}
