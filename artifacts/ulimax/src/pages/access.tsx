import { useState } from "react";
import {
  useListUsers,
  useUpdateUserRole,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Wrench, Eye, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

type UserRole = "gestor" | "executor" | "observador";

const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; badge: string }> = {
  gestor:     { label: "Gestor",     icon: ShieldCheck, badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  executor:   { label: "Executor",   icon: Wrench,      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  observador: { label: "Observador", icon: Eye,         badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role as UserRole];
  if (!meta) return <span>{role}</span>;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", meta.badge)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function Access() {
  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useAppUser();
  const [pendingId, setPendingId] = useState<number | null>(null);

  function handleRoleChange(userId: number, role: UserRole) {
    if (userId === me?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode alterar o seu próprio papel.",
        variant: "destructive",
      });
      return;
    }
    setPendingId(userId);
    updateRole.mutate(
      { id: userId, data: { role } },
      {
        onSuccess: () => {
          toast({ title: "Papel atualizado com sucesso." });
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        },
        onError: () => {
          toast({
            title: "Erro ao atualizar papel",
            variant: "destructive",
          });
        },
        onSettled: () => setPendingId(null),
      }
    );
  }

  const gestores   = users?.filter((u) => u.role === "gestor").length ?? 0;
  const executores = users?.filter((u) => u.role === "executor").length ?? 0;
  const observadores = users?.filter((u) => u.role === "observador").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesso</h1>
          <p className="text-muted-foreground mt-1">Gerencie os papéis dos usuários do sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-3xl font-bold">{users?.length ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gestores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-3xl font-bold">{gestores}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Executores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-3xl font-bold">{executores}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Observadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-slate-500" />
              </div>
              <span className="text-3xl font-bold">{observadores}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-sm text-muted-foreground bg-muted/40 border rounded-lg p-4 grid gap-3 sm:grid-cols-3">
        {(Object.entries(ROLE_META) as [UserRole, (typeof ROLE_META)[UserRole]][]).map(([role, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={role} className="flex items-start gap-2">
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", role === "gestor" ? "text-emerald-600" : role === "executor" ? "text-blue-600" : "text-slate-500")} />
              <div>
                <p className="font-medium text-foreground">{meta.label}</p>
                <p className="text-xs leading-snug mt-0.5">
                  {role === "gestor"     && "Acesso total — gerencia equipe, papéis, projetos e tarefas."}
                  {role === "executor"   && "Cria e edita projetos e tarefas, atribui responsáveis."}
                  {role === "observador" && "Apenas visualiza informações, sem criar ou editar."}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-52">Papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.email}
                      {u.id === me?.id && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">você</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.id === me?.id ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}
                          disabled={pendingId === u.id}
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="executor">Executor</SelectItem>
                            <SelectItem value="observador">Observador</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
