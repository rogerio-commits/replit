import { useMemo } from "react";
import { useGetMetricsTrends } from "@workspace/api-client-react";
import type { MetricsTrendPoint } from "@workspace/api-client-react";
import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPARE_DAYS = 7;
const CHART_POINTS = 14;

/** Foto mais recente registrada até `daysAgo` dias atrás (ou null se não houver). */
function comparisonPoint(
  points: MetricsTrendPoint[],
  daysAgo: number,
): MetricsTrendPoint | null {
  const target = new Date(Date.now() - daysAgo * 86400000)
    .toISOString()
    .slice(0, 10);
  let chosen: MetricsTrendPoint | null = null;
  for (const p of points) if (p.date <= target) chosen = p;
  return chosen;
}

function DeltaStat({
  label,
  current,
  past,
}: {
  label: string;
  current: number;
  past: number | null;
}) {
  const diff = past == null ? null : current - past;
  // Menos é melhor (vencidas/em aberto): queda = verde, alta = vermelho.
  const tone =
    diff == null || diff === 0
      ? "text-muted-foreground"
      : diff < 0
        ? "text-emerald-600"
        : "text-red-600";
  const Icon = diff == null || diff === 0 ? Minus : diff < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{current}</span>
        <span className={cn("flex items-center gap-0.5 text-xs font-semibold", tone)}>
          <Icon className="h-3.5 w-3.5" />
          {diff == null
            ? "sem histórico"
            : diff === 0
              ? "estável"
              : `${diff > 0 ? "+" : ""}${diff} vs. 7d`}
        </span>
      </div>
    </div>
  );
}

/**
 * Faixa de tendência: mostra os valores de agora comparados com a foto de ~7
 * dias atrás e a vazão (tarefas concluídas por dia). Depende dos snapshots
 * diários; enquanto não houver histórico, exibe só o valor atual.
 */
export function TrendsStrip() {
  const { data } = useGetMetricsTrends();

  const chartData = useMemo(() => {
    const pts = data?.points ?? [];
    return pts.slice(-CHART_POINTS).map((p) => ({
      date: p.date.slice(5),
      concluidas: p.tasksCompleted,
    }));
  }, [data]);

  if (!data) return null;

  const points = data.points;
  const past = comparisonPoint(points, COMPARE_DAYS);
  const completedLast7 = points
    .filter((p) => p.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
    .reduce((sum, p) => sum + p.tasksCompleted, 0);
  const maxCompleted = Math.max(1, ...chartData.map((d) => d.concluidas));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">📈 Tendência da semana</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-center">
        <DeltaStat label="Vencidas" current={data.current.overdueTasks} past={past?.overdueTasks ?? null} />
        <DeltaStat label="Em aberto" current={data.current.openTasks} past={past?.openTasks ?? null} />
        <div className="min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Concluídas por dia</span>
            <span className="text-xs font-semibold text-emerald-600">{completedLast7} nos últimos 7 dias</span>
          </div>
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Coletando histórico — aparece a partir do próximo dia.</p>
          ) : (
            <div className="h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="concluidas" radius={[2, 2, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.concluidas >= maxCompleted ? "#10b981" : "#6ee7b7"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
