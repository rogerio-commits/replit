import { useGetProjectBurndown } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  projectId: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }} className="text-xs">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function ProjectBurndown({ projectId }: Props) {
  const [open, setOpen] = useState(true);
  const { data: points, isLoading } = useGetProjectBurndown(projectId);

  const hasData = points && points.some(p => p.created > 0 || p.completed > 0);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
      >
        <TrendingUp className="h-4 w-4 text-primary" />
        Progresso Semanal
        <span className="text-xs font-normal text-muted-foreground ml-1">— criadas vs concluídas</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
      </button>

      {open && (
        <>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : !hasData ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma atividade nas últimas 12 semanas.
            </p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    iconSize={10}
                  />
                  <Bar dataKey="created"   name="Criadas"    fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Concluídas" fill="hsl(var(--primary))"          radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
