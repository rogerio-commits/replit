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
import { ShieldCheck, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/useAppUser";

export default function Access() {
  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useAppUser();
  const [pendingId, setPendingId] = useState<number | null>(null);

  function handleRoleChange(userId: number, role: "gestor" | "colaborador") {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesso</h1>
          <p className="text-muted-foreground mt-1">Gerencie os papéis dos usuários do sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
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
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-3xl font-bold">
                {users?.filter((u) => u.role === "gestor").length ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-40">Papel</TableHead>
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
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) =>
                          handleRoleChange(u.id, v as "gestor" | "colaborador")
                        }
                        disabled={u.id === me?.id || pendingId === u.id}
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="colaborador">Colaborador</SelectItem>
                        </SelectContent>
                      </Select>
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
