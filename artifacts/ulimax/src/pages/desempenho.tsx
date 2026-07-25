import { useMemo, useState } from "react";
import { useListTasks } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingUp, CheckCircle2, Timer, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysFromToday, parseLocalDate } from "@/lib/project-health";

// ── Desempenho da equipe em números simples ──────────────────────────────────
// Sem métricas complicadas: concluídas no prazo vs. atrasadas por pessoa,
// tempo médio de conclusão e o que cada um tem em aberto agora.

type AnyTask = {
  id: number;
  title: string;
  status: string;
  assigneeName?: string | null;
  dueDate?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

interface PersonStats {
  name: string;
  done: number;        // concluídas no período
  onTime: number;      // concluídas até o prazo
  late: number;        // concluídas depois do prazo
  noDue: number;       // concluídas sem prazo definido
  avgDays: number | null; // tempo médio criação → conclusão
  openNow: number;     // abertas hoje
  overdueNow: number;  // atrasadas hoje
}

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "all", label: "Desde o início" },
];

export default function Desempenho() {
  const { data: tasks, isLoading } = useListTasks();
  const [period, setPeriod] = useState("30");

  const { people, team } = useMemo(() => {
    const all = (tasks ?? []) as AnyTask[];
    const limit = period === "all" ? Infinity : parseInt(period, 10);

    const inPeriod = (t: AnyTask) =>
      t.status === "done" && !!t.completedAt && -daysFromToday(t.completedAt) <= limit;

    const map = new Map<string, PersonStats & { sumDays: number; nDays: number }>();
    const get = (name: string) => {
      let s = map.get(name);
      if (!s) {
        s = { name, done: 0, onTime: 0, late: 0, noDue: 0, avgDays: null, openNow: 0, overdueNow: 0, sumDays: 0, nDays: 0 };
        map.set(name, s);
      }
      return s;
    };

    for (const t of all) {
      const name = t.assigneeName ?? null;
      if (!name) continue; // desempenho é por pessoa; sem responsável não conta

      const s = get(name);
      if (t.status !== "done") {
        s.openNow++;
        if (t.dueDate && daysFromToday(t.dueDate) < 0) s.overdueNow++;
      } else if (inPeriod(t)) {
        s.done++;
        if (t.dueDate) {
          const doneDay = parseLocalDate(t.completedAt!);
          const dueDay = parseLocalDate(t.dueDate);
          if (doneDay.getTime() <= dueDay.getTime()) s.onTime++;
          else s.late++;
        } else {
          s.noDue++;
        }
        const days = Math.max(0, Math.round(
          (parseLocalDate(t.completedAt!).getTime() - parseLocalDate(t.createdAt).getTime()) / 86_400_000
        ));
        s.sumDays += days;
        s.nDays++;
      }
    }

    const people = Array.from(map.values())
      .map((s) => ({ ...s, avgDays: s.nDays > 0 ? Math.round((s.sumDays / s.nDays) * 10) / 10 : null }))
      .filter((s) => s.done > 0 || s.openNow > 0)
      .sort((a, b) => b.done - a.done);

    const totalDone = people.reduce((acc, p) => acc + p.done, 0);
    const totalOnTime = people.reduce((acc, p) => acc + p.onTime, 0);
    const totalLate = people.reduce((acc, p) => acc + p.late, 0);
    const withDue = totalOnTime + totalLate;
    const sumAll = people.reduce((acc, p) => acc + p.sumDays, 0);
    const nAll = people.reduce((acc, p) => acc + p.nDays, 0);

    const team = {
      done: totalDone,
      punctuality: withDue > 0 ? Math.round((totalOnTime / withDue) * 100) : null,
      avgDays: nAll > 0 ? Math.round((sumAll / nAll) * 10) / 10 : null,
      openNow: people.reduce((acc, p) => acc + p.openNow, 0),
      overdueNow: people.reduce((acc, p) => acc + p.overdueNow, 0),
    };

    return { people, team };
  }, [tasks, period]);

  const chartData = people.slice(0, 12).map((p) => ({
    name: p.name.split(" ")[0],
    "No prazo": p.onTime,
    "Com atraso": p.late,
    "Sem prazo": p.noDue,
  }));

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            Desempenho da Equipe
          </h1>
          <p className="text-muted-foreground mt-1">Concluídas, pontualidade e ritmo — em números simples.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Resumo da equipe */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Concluídas</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{team.done}</div>
              <p className="text-xs text-muted-foreground">no período escolhido</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Pontualidade</span>
                <Timer className="h-4 w-4 text-blue-500" />
              </div>
              <div className={cn("text-2xl font-bold mt-1",
                team.punctuality === null ? "text-foreground" : team.punctuality >= 70 ? "text-emerald-600" : team.punctuality >= 40 ? "text-amber-600" : "text-red-600"
              )}>
                {team.punctuality === null ? "—" : `${team.punctuality}%`}
              </div>
              <p className="text-xs text-muted-foreground">concluídas dentro do prazo</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tempo médio</span>
                <TrendingUp className="h-4 w-4 text-violet-500" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {team.avgDays === null ? "—" : `${team.avgDays}d`}
              </div>
              <p className="text-xs text-muted-foreground">da criação à conclusão</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Abertas agora</span>
                <AlertCircle className={cn("h-4 w-4", team.overdueNow > 0 ? "text-red-500" : "text-muted-foreground")} />
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{team.openNow}</div>
              <p className={cn("text-xs", team.overdueNow > 0 ? "text-red-600 font-medium" : "text-muted-foreground")}>
                {team.overdueNow > 0 ? `${team.overdueNow} atrasada(s)` : "nenhuma atrasada"}
              </p>
            </div>
          </div>

          {/* Gráfico por pessoa */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Concluídas por pessoa</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa concluída no período.</p>
            ) : (
              <div style={{ height: Math.max(220, chartData.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="No prazo" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Com atraso" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Sem prazo" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabela detalhada */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Pessoa</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Concluídas</th>
                    <th className="px-3 py-2.5 font-semibold text-center">No prazo</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Com atraso</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Pontualidade</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Tempo médio</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Abertas agora</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Atrasadas agora</th>
                  </tr>
                </thead>
                <tbody>
                  {people.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Sem dados no período.</td></tr>
                  ) : people.map((p, idx) => {
                    const withDue = p.onTime + p.late;
                    const punct = withDue > 0 ? Math.round((p.onTime / withDue) * 100) : null;
                    return (
                      <tr key={p.name} className={cn("border-b last:border-0", idx % 2 === 1 && "bg-muted/10")}>
                        <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                        <td className="px-3 py-2.5 text-center font-semibold tabular-nums">{p.done}</td>
                        <td className="px-3 py-2.5 text-center text-emerald-600 tabular-nums">{p.onTime}</td>
                        <td className={cn("px-3 py-2.5 text-center tabular-nums", p.late > 0 ? "text-red-600 font-medium" : "text-muted-foreground")}>{p.late}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {punct === null ? <span className="text-muted-foreground/50">—</span> : (
                            <span className={cn("font-semibold", punct >= 70 ? "text-emerald-600" : punct >= 40 ? "text-amber-600" : "text-red-600")}>{punct}%</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{p.avgDays === null ? "—" : `${p.avgDays}d`}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{p.openNow}</td>
                        <td className={cn("px-3 py-2.5 text-center tabular-nums", p.overdueNow > 0 ? "text-red-600 font-semibold" : "text-muted-foreground/50")}>{p.overdueNow}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground px-4 py-2 border-t bg-muted/20">
              Pontualidade considera apenas tarefas com prazo definido. Tarefas sem responsável não entram nesta análise.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
