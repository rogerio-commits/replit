import { useGetMemberProductivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, CheckCircle2, Clock, AlertCircle, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  gestor: "Gestor",
  executor: "Executor",
  observador: "Observador",
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${color}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Productivity() {
  const { data: members, isLoading } = useGetMemberProductivity();

  const totals = members?.reduce(
    (acc, m) => ({
      total: acc.total + m.totalTasks,
      done: acc.done + m.doneTasks,
      open: acc.open + m.openTasks,
      overdue: acc.overdue + m.overdueTasks,
    }),
    { total: 0, done: 0, open: 0, overdue: 0 }
  ) ?? { total: 0, done: 0, open: 0, overdue: 0 };

  const chartData = members
    ?.filter((m) => m.totalTasks > 0)
    .sort((a, b) => b.totalTasks - a.totalTasks)
    .slice(0, 10)
    .map((m) => ({
      name: m.memberName.split(" ")[0],
      Concluídas: m.doneTasks,
      Abertas: m.openTasks,
      Vencidas: m.overdueTasks,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Produtividade por Membro
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do desempenho da equipe por tarefas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total de tarefas" value={totals.total} icon={CheckCircle2} color="bg-blue-50 border-blue-200 text-blue-700" />
        <StatCard label="Concluídas" value={totals.done} icon={CheckCircle2} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <StatCard label="Em aberto" value={totals.open} icon={Clock} color="bg-amber-50 border-amber-200 text-amber-700" />
        <StatCard label="Vencidas" value={totals.overdue} icon={AlertCircle} color="bg-red-50 border-red-200 text-red-700" />
      </div>

      {/* Bar chart */}
      {!isLoading && chartData && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tarefas por Membro</CardTitle>
            <CardDescription>Top membros por volume de tarefas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Concluídas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Abertas" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Vencidas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Member table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Detalhes por Membro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-4">
              {members
                .sort((a, b) => b.totalTasks - a.totalTasks)
                .map((m) => {
                  const initials = m.memberName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const completionRate = m.totalTasks > 0 ? Math.round((m.doneTasks / m.totalTasks) * 100) : 0;
                  return (
                    <div key={m.memberId} className="flex items-center gap-4">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{m.memberName}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {ROLE_LABELS[m.role] ?? m.role}
                          </Badge>
                          {m.overdueTasks > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                              {m.overdueTasks} vencida{m.overdueTasks !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={completionRate} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">{completionRate}%</span>
                        </div>
                      </div>
                      <div className="hidden md:flex gap-4 text-center shrink-0">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{m.totalTasks}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-600">{m.doneTasks}</p>
                          <p className="text-[10px] text-muted-foreground">Feitas</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-600">{m.openTasks}</p>
                          <p className="text-[10px] text-muted-foreground">Abertas</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro com tarefas</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
