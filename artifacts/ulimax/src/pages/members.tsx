import { useState } from "react";
import {
  useListMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useListUsers,
  useUpdateUserRole,
  useListInvitations,
  useCreateInvitation,
  useDeleteInvitation,
  getListMembersQueryKey,
  type Member,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Mail,
  HardHat,
  ShieldCheck,
  Wrench,
  Eye,
  Send,
  Clock,
  X,
  FolderKanban,
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsGestor } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SystemRole = "gestor" | "executor" | "observador";
type MemberTeam = "projetos" | "tecnica";

const ROLE_META: Record<SystemRole, { label: string; icon: React.ElementType; cls: string }> = {
  gestor:     { label: "Gestor",     icon: ShieldCheck, cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700" },
  executor:   { label: "Executor",   icon: Wrench,      cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
  observador: { label: "Observador", icon: Eye,         cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600" },
};

const TEAM_META: Record<MemberTeam, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  projetos: {
    label: "Equipe de Projetos",
    icon: FolderKanban,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  tecnica: {
    label: "Equipe Técnica",
    icon: Settings2,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
  },
};

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role as SystemRole];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border", meta.cls)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

const memberSchema = z.object({
  name:         z.string().min(1, "Nome obrigatório"),
  role:         z.string().min(1, "Cargo obrigatório"),
  email:        z.string().email("E-mail válido obrigatório"),
  team:         z.enum(["projetos", "tecnica"]),
  intendedRole: z.enum(["gestor", "executor", "observador"]),
  sendInvite:   z.boolean(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberCardProps {
  member: Member;
  users: { id: number; email: string; role: string }[] | undefined;
  invitations: { id: number; email: string; name: string; intendedRole: string; invitedAt: string }[] | undefined;
  isGestor: boolean;
  pendingRoleId: number | null;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onRoleChange: (userId: number, role: SystemRole) => void;
  onRevokeInvite: (id: number, email: string) => void;
  onSendInvite: (member: Member) => void;
  deleteInvitationPending: boolean;
}

function MemberCard({
  member, users, invitations, isGestor, pendingRoleId,
  onEdit, onDelete, onRoleChange, onRevokeInvite, onSendInvite, deleteInvitationPending,
}: MemberCardProps) {
  const linkedUser = users?.find(u => u.email.toLowerCase() === member.email.toLowerCase());
  const pendingInvite = invitations?.find(inv => inv.email.toLowerCase() === member.email.toLowerCase());

  return (
    <Card className="overflow-hidden bg-card/50">
      <div className="p-5 flex items-start gap-4">
        <Avatar className="h-12 w-12 border bg-muted shrink-0">
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
          <div className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-1.5">
            <Mail className="h-3 w-3 shrink-0" />
            {member.email}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
          Acesso ao sistema
        </p>
        {linkedUser ? (
          isGestor ? (
            <Select
              value={linkedUser.role}
              onValueChange={(v) => onRoleChange(linkedUser.id, v as SystemRole)}
              disabled={pendingRoleId === linkedUser.id}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gestor">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Gestor</span>
                </SelectItem>
                <SelectItem value="executor">
                  <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-blue-600" />Executor</span>
                </SelectItem>
                <SelectItem value="observador">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-slate-500" />Observador</span>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <RoleBadge role={linkedUser.role} />
          )
        ) : pendingInvite ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20 text-[11px] gap-1">
              <Clock className="h-3 w-3" />
              Convite enviado
            </Badge>
            <RoleBadge role={pendingInvite.intendedRole} />
          </div>
        ) : isGestor ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground"
            onClick={() => onSendInvite(member)}
          >
            <Send className="h-3 w-3" />
            Enviar convite
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Sem conta cadastrada</span>
        )}
      </div>

      {isGestor && (
        <div className="bg-muted/50 px-4 py-2 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(member)} className="h-8 text-muted-foreground">
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
            <DialogContent className="sm:max-w-[360px]">
              <DialogHeader>
                <DialogTitle>Remover membro?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Isso remove <strong>{member.name}</strong> da equipe. Esta ação não pode ser desfeita.
              </p>
              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={() => onDelete(member.id)}>Remover</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Card>
  );
}

interface TeamSectionProps {
  team: MemberTeam;
  members: Member[];
  isLoading: boolean;
  users: { id: number; email: string; role: string }[] | undefined;
  invitations: { id: number; email: string; name: string; intendedRole: string; invitedAt: string }[] | undefined;
  isGestor: boolean;
  pendingRoleId: number | null;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onRoleChange: (userId: number, role: SystemRole) => void;
  onRevokeInvite: (id: number, email: string) => void;
  onSendInvite: (member: Member) => void;
  deleteInvitationPending: boolean;
}

function TeamSection({ team, members, isLoading, ...cardProps }: TeamSectionProps) {
  const meta = TEAM_META[team];
  const Icon = meta.icon;

  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2.5 px-4 py-2.5 rounded-lg border", meta.bg, meta.border)}>
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", meta.bg)}>
          <Icon className={cn("h-4 w-4", meta.color)} />
        </div>
        <div>
          <h2 className={cn("text-sm font-semibold", meta.color)}>{meta.label}</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "..." : `${members.length} membro${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg bg-muted/20">
          <Icon className={cn("h-8 w-8 mb-2 opacity-30", meta.color)} />
          <p className="text-sm text-muted-foreground">Nenhum membro nesta equipe ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} {...cardProps} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Members() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isGestor = useIsGestor();

  const { data: members, isLoading } = useListMembers();
  const { data: users }               = useListUsers();
  const { data: invitations }         = useListInvitations();
  const updateUserRole    = useUpdateUserRole();
  const createInvitation  = useCreateInvitation();
  const deleteInvitation  = useDeleteInvitation();
  const createMember      = useCreateMember();
  const updateMember      = useUpdateMember();
  const deleteMember      = useDeleteMember();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", role: "", email: "", team: "projetos", intendedRole: "executor", sendInvite: true },
  });

  const sendInviteWatched = form.watch("sendInvite");

  const resetDialog = () => {
    setEditingMember(null);
    form.reset({ name: "", role: "", email: "", team: "projetos", intendedRole: "executor", sendInvite: true });
  };

  const onSubmit = (data: MemberFormValues) => {
    const memberPayload = { name: data.name, role: data.role, email: data.email, team: data.team };

    if (editingMember !== null) {
      updateMember.mutate({ id: editingMember, data: memberPayload }, {
        onSuccess: () => {
          toast({ title: "Membro atualizado com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          setIsCreateOpen(false);
          resetDialog();
        },
        onError: () => toast({ title: "Erro ao atualizar membro", variant: "destructive" }),
      });
      return;
    }

    createMember.mutate({ data: memberPayload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        if (data.sendInvite) {
          createInvitation.mutate(
            { data: { email: data.email, name: data.name, intendedRole: data.intendedRole } },
            {
              onSuccess: () => {
                toast({ title: "Membro adicionado e convite enviado!", description: `Um e-mail foi enviado para ${data.email}.` });
                queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
              },
              onError: (err: unknown) => {
                const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
                toast({ title: "Membro adicionado, mas o convite falhou", description: msg ?? "Tente reenviar o convite manualmente.", variant: "destructive" });
              },
            }
          );
        } else {
          toast({ title: "Membro adicionado com sucesso" });
        }
        setIsCreateOpen(false);
        resetDialog();
      },
      onError: () => toast({ title: "Erro ao adicionar membro", variant: "destructive" }),
    });
  };

  const handleEdit = (member: Member) => {
    form.reset({
      name: member.name,
      role: member.role,
      email: member.email,
      team: (member.team as MemberTeam) ?? "projetos",
      intendedRole: "executor",
      sendInvite: false,
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
      onError: () => toast({ title: "Erro ao remover membro", variant: "destructive" }),
    });
  };

  const handleRoleChange = (userId: number, role: SystemRole) => {
    setPendingRoleId(userId);
    updateUserRole.mutate({ id: userId, data: { role } }, {
      onSuccess: () => {
        toast({ title: "Acesso atualizado com sucesso." });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      },
      onError: () => toast({ title: "Erro ao atualizar acesso", variant: "destructive" }),
      onSettled: () => setPendingRoleId(null),
    });
  };

  const handleRevokeInvite = (id: number, email: string) => {
    deleteInvitation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Convite cancelado", description: `O convite para ${email} foi revogado.` });
        queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      },
      onError: () => toast({ title: "Erro ao cancelar convite", variant: "destructive" }),
    });
  };

  const handleSendInvite = (member: Member) => {
    form.reset({ name: member.name, role: member.role, email: member.email, team: (member.team as MemberTeam) ?? "projetos", intendedRole: "executor", sendInvite: true });
    setEditingMember(null);
    setIsCreateOpen(true);
  };

  const filtered = (members ?? []).filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const projetosMembers = filtered.filter((m) => m.team === "projetos");
  const tecnicaMembers  = filtered.filter((m) => m.team === "tecnica");

  const isPending = createMember.isPending || updateMember.isPending || createInvitation.isPending;

  const cardProps = {
    users, invitations, isGestor, pendingRoleId,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onRoleChange: handleRoleChange,
    onRevokeInvite: handleRevokeInvite,
    onSendInvite: handleSendInvite,
    deleteInvitationPending: deleteInvitation.isPending,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie colaboradores por equipe, cargos e acesso ao sistema.</p>
        </div>

        {isGestor && (
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>{editingMember ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input placeholder="Ex.: Carlos Silva" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo / Função</FormLabel>
                      <FormControl><Input placeholder="Ex.: Engenheiro Civil" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input type="email" placeholder="carlos@ulimax.com.br" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="team" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipe</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a equipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="projetos">
                            <span className="flex items-center gap-2">
                              <FolderKanban className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Equipe de Projetos</span>
                            </span>
                          </SelectItem>
                          <SelectItem value="tecnica">
                            <span className="flex items-center gap-2">
                              <Settings2 className="h-4 w-4 text-orange-600" />
                              <span className="font-medium">Equipe Técnica</span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {!editingMember && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium">Convidar para o sistema</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Envia um e-mail de convite para criar conta</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={sendInviteWatched}
                          onClick={() => form.setValue("sendInvite", !sendInviteWatched)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            sendInviteWatched ? "bg-primary" : "bg-input"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            sendInviteWatched ? "translate-x-4" : "translate-x-0.5"
                          )} />
                        </button>
                      </div>

                      {sendInviteWatched && (
                        <FormField control={form.control} name="intendedRole" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Papel no sistema</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o papel" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gestor">
                                  <span className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    <span><span className="font-medium">Gestor</span><span className="text-muted-foreground ml-1 text-xs">— acesso total</span></span>
                                  </span>
                                </SelectItem>
                                <SelectItem value="executor">
                                  <span className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4 text-blue-600" />
                                    <span><span className="font-medium">Executor</span><span className="text-muted-foreground ml-1 text-xs">— cria projetos e tarefas</span></span>
                                  </span>
                                </SelectItem>
                                <SelectItem value="observador">
                                  <span className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-slate-500" />
                                    <span><span className="font-medium">Observador</span><span className="text-muted-foreground ml-1 text-xs">— somente visualiza</span></span>
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="submit" disabled={isPending} className="w-full">
                      {isPending ? "Salvando..." : editingMember ? "Atualizar" : sendInviteWatched ? (
                        <><Send className="mr-2 h-4 w-4" />Adicionar e Convidar</>
                      ) : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending invitations */}
      {isGestor && invitations && invitations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
            <Clock className="h-4 w-4" />
            Convites Pendentes
            <span className="text-xs font-normal text-muted-foreground">({invitations.length})</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3"
              >
                <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <RoleBadge role={inv.intendedRole} />
                    <span className="text-[10px] text-muted-foreground">
                      · {format(new Date(inv.invitedAt), "d MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRevokeInvite(inv.id, inv.email)}
                  disabled={deleteInvitation.isPending}
                  title="Cancelar convite"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
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
        <CardContent className="space-y-8">
          <TeamSection team="projetos" members={projetosMembers} isLoading={isLoading} {...cardProps} />
          <TeamSection team="tecnica"  members={tecnicaMembers}  isLoading={isLoading} {...cardProps} />
        </CardContent>
      </Card>
    </div>
  );
}
