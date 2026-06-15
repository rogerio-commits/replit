import { useState } from "react";
import { 
  useListMembers, 
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  getListMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Trash2, Edit, Mail, HardHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";

const memberSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  role: z.string().min(1, "Cargo obrigatório"),
  email: z.string().email("E-mail válido obrigatório"),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function Members() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isGestor = useIsGestor();

  const { data: members, isLoading } = useListMembers();
  
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
    },
  });

  const onSubmit = (data: MemberFormValues) => {
    if (editingMember === null) {
      createMember.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Membro adicionado com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          setIsCreateOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Erro ao adicionar membro", variant: "destructive" });
        }
      });
    } else {
      updateMember.mutate({ id: editingMember, data }, {
        onSuccess: () => {
          toast({ title: "Membro atualizado com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          setIsCreateOpen(false);
          setEditingMember(null);
          form.reset();
        },
        onError: () => {
          toast({ title: "Erro ao atualizar membro", variant: "destructive" });
        }
      });
    }
  };

  const handleEdit = (member: any) => {
    form.reset({
      name: member.name,
      role: member.role,
      email: member.email,
    });
    setEditingMember(member.id);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMember.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Membro removido" });
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
      onError: () => {
        toast({ title: "Erro ao remover membro", variant: "destructive" });
      }
    });
  };

  const filteredMembers = members?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie colaboradores, cargos e contatos.</p>
        </div>

        {isGestor && <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingMember(null);
            form.reset({
              name: "",
              role: "",
              email: "",
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingMember ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Carlos Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo / Função</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Engenheiro Civil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="carlos@ulimax.com.br" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMember.isPending || updateMember.isPending}>
                    {createMember.isPending || updateMember.isPending ? "Salvando..." : (editingMember ? "Atualizar" : "Adicionar")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou e-mail..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : filteredMembers && filteredMembers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="overflow-hidden bg-card/50">
                  <div className="p-5 flex items-start gap-4">
                    <Avatar className="h-12 w-12 border bg-muted">
                      {member.avatarUrl ? (
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                      ) : (
                        <AvatarFallback className="text-primary font-bold bg-primary/10">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{member.name}</div>
                      <div className="text-sm text-primary font-medium truncate flex items-center gap-1 mt-0.5">
                        <HardHat className="h-3 w-3" />
                        {member.role}
                      </div>
                      <div className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-2">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  {isGestor && <div className="bg-muted/50 px-4 py-2 border-t flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(member)} className="h-8 text-muted-foreground">
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remover
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remover Membro</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          Tem certeza que deseja remover <strong>{member.name}</strong> da equipe? Esta ação não pode ser desfeita.
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <Button variant="destructive" onClick={() => handleDelete(member.id)} disabled={deleteMember.isPending}>
                            {deleteMember.isPending ? "Removendo..." : "Remover"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>}
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center">
              <HardHat className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">Nenhum membro encontrado</h3>
              <p className="text-muted-foreground mt-1">
                {search ? "Tente ajustar sua busca" : "Comece adicionando membros à equipe"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
