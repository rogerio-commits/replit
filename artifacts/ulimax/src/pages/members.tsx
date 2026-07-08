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
  KeyRound,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
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
    label: "Equipe",
    icon: FolderKanban,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
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
});

type MemberFormValues = z.infer<typeof memberSchema>;

const inviteRoleSchema = z.object({
  intendedRole: z.enum(["gestor", "executor", "observador"]),
});

type InviteRoleValues = z.infer<typeof inviteRoleSchema>;

interface MemberCardProps {
  member: Member;
  users: { id: number; email: string; role: string }[] | undefined;
  invitations: { id: number; email: string; name: string; intendedRole: string; invitedAt: string }[] | undefined;
  isGestor: boolean;
  pendingRoleId: number | null;
  resendingInviteId: number | null;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onRoleChange: (userId: number, role: SystemRole) => void;
  onRevokeInvite: (id: number, email: string) => void;
  onSendInvite: (member: Member) => void;
  onResendInvite: (inviteId: number, member: { email: string; name: string }, intendedRole: string) => void;
  onResetLink: (memberId: number, memberName: string) => void;
}

function MemberCard({
  member, users, invitations, isGestor, pendingRoleId, resendingInviteId,
  onEdit, onDelete, onRoleChange, onRevokeInvite, onSendInvite, onResendInvite, onResetLink,
}: MemberCardProps) {
  const linkedUser   = users?.find(u => u.email.toLowerCase() === member.email.toLowerCase());
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20 text-[11px] gap-1">
              <Clock className="h-3 w-3" />
              Convite enviado
            </Badge>
            <RoleBadge role={pendingInvite.intendedRole} />
            {isGestor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                disabled={resendingInviteId === pendingInvite.id}
                onClick={() => onResendInvite(pendingInvite.id, member, pendingInvite.intendedRole)}
              >
                <RefreshCw className={cn("h-3 w-3", resendingInviteId === pendingInvite.id && "animate-spin")} />
                {resendingInviteId === pendingInvite.id ? "Reenviando…" : "Reenviar"}
              </Button>
            )}
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
        <div className="bg-muted/50 px-4 py-2 border-t flex justify-end gap-2 flex-wrap">
          {member.email && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => onResetLink(member.id, member.name)}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              Redefinir senha
            </Button>
          )}
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
  resendingInviteId: number | null;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onRoleChange: (userId: number, role: SystemRole) => void;
  onRevokeInvite: (id: number, email: string) => void;
  onSendInvite: (member: Member) => void;
  onResendInvite: (inviteId: number, member: { email: string; name: string }, intendedRole: string) => void;
  onResetLink: (memberId: number, memberName: string) => void;
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

function RoleSelectItems() {
  return (
    <>
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
    </>
  );
}

export default function Members() {
  const [search, setSearch]               = useState("");
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [invitingMember, setInvitingMember] = useState<Member | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [resetLinkData, setResetLinkData] = useState<{ memberName: string; url: string } | null>(null);
  const [resetLinkLoading, setResetLinkLoading] = useState(false);
  const [copiedLink, setCopiedLink]       = useState(false);

  const { toast }      = useToast();
  const { getToken }   = useAuth();
  const queryClient    = useQueryClient();
  const isGestor       = useIsGestor();

  const { data: members, isLoading } = useListMembers();
  const { data: users }              = useListUsers();
  const { data: invitations }        = useListInvitations();
  const updateUserRole   = useUpdateUserRole();
  const createInvitation = useCreateInvitation();
  const deleteInvitation = useDeleteInvitation();
  const createMember     = useCreateMember();
  const updateMember     = useUpdateMember();
  const deleteMember     = useDeleteMember();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", role: "", email: "", team: "projetos", intendedRole: "executor" },
  });

  const inviteRoleForm = useForm<InviteRoleValues>({
    resolver: zodResolver(inviteRoleSchema),
    defaultValues: { intendedRole: "executor" },
  });

  const resetDialog = () => {
    setEditingMember(null);
    form.reset({ name: "", role: "", email: "", team: "projetos", intendedRole: "executor" });
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
        setIsCreateOpen(false);
        resetDialog();
        createInvitation.mutate(
          { data: { email: data.email, name: data.name, intendedRole: data.intendedRole } },
          {
            onSuccess: () => {
              toast({ title: "Membro adicionado e convite enviado!", description: `Um e-mail foi enviado para ${data.email}.` });
              queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
            },
            onError: (err: unknown) => {
              const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "";
              if (msg.includes("convite já foi enviado")) {
                toast({ title: "Membro adicionado!", description: "Este colaborador já tem um convite pendente — ele receberá acesso ao aceitar." });
                queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
              } else if (msg.includes("já possui uma conta")) {
                toast({ title: "Membro adicionado!", description: "Este colaborador já tem conta no sistema e pode acessar normalmente." });
              } else {
                toast({ title: "Membro adicionado", description: "Não foi possível enviar o convite. Use o botão 'Enviar convite' no card do membro.", variant: "destructive" });
              }
            },
          }
        );
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
    inviteRoleForm.reset({ intendedRole: "executor" });
    setInvitingMember(member);
  };

  const handleSubmitInvite = (data: InviteRoleValues) => {
    if (!invitingMember) return;
    createInvitation.mutate(
      { data: { email: invitingMember.email, name: invitingMember.name, intendedRole: data.intendedRole } },
      {
        onSuccess: () => {
          toast({ title: "Convite enviado!", description: `Um e-mail foi enviado para ${invitingMember.email}.` });
          queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
          setInvitingMember(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({ title: "Erro ao enviar convite", description: msg ?? "Tente novamente.", variant: "destructive" });
        },
      }
    );
  };

  const handleResendInvite = (inviteId: number, member: { email: string; name: string }, intendedRole: string) => {
    setResendingInviteId(inviteId);
    deleteInvitation.mutate({ id: inviteId }, {
      onSuccess: () => {
        createInvitation.mutate(
          { data: { email: member.email, name: member.name, intendedRole: intendedRole as SystemRole } },
          {
            onSuccess: () => {
              toast({ title: "Convite reenviado!", description: `Um novo e-mail foi enviado para ${member.email}.` });
              queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
            },
            onError: () => toast({ title: "Erro ao reenviar convite", variant: "destructive" }),
            onSettled: () => setResendingInviteId(null),
          }
        );
      },
      onError: () => {
        toast({ title: "Erro ao reenviar convite", variant: "destructive" });
        setResendingInviteId(null);
      },
    });
  };

  const handleAddMemberFromInvite = (inv: { email: string; name: string; intendedRole: string }) => {
    form.reset({
      name: inv.name,
      role: "",
      email: inv.email,
      team: "projetos",
      intendedRole: inv.intendedRole as SystemRole,
    });
    setEditingMember(null);
    setIsCreateOpen(true);
  };

  const handleResetLink = async (memberId: number, memberName: string) => {
    setResetLinkLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/members/${memberId}/signin-link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro desconhecido");
      setResetLinkData({ memberName, url: data.url });
    } catch (err: unknown) {
      toast({ title: "Erro ao gerar link", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setResetLinkLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!resetLinkData) return;
    navigator.clipboard.writeText(resetLinkData.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filtered = (members ?? []).filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMember.isPending || updateMember.isPending || createInvitation.isPending;

  const cardProps = {
    users, invitations, isGestor, pendingRoleId, resendingInviteId,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onRoleChange: handleRoleChange,
    onRevokeInvite: handleRevokeInvite,
    onSendInvite: handleSendInvite,
    onResendInvite: handleResendInvite,
    onResetLink: handleResetLink,
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
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle>{editingMember ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
              </DialogHeader>
              {!editingMember && (
                <p className="text-sm text-muted-foreground -mt-1">
                  O membro será adicionado à equipe e receberá um e-mail de convite para criar sua senha.
                </p>
              )}
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

                  {!editingMember && (
                    <FormField control={form.control} name="intendedRole" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Papel no sistema</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
                          </FormControl>
                          <SelectContent><RoleSelectItems /></SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <DialogFooter>
                    <Button type="submit" disabled={isPending} className="w-full">
                      {isPending
                        ? "Salvando..."
                        : editingMember
                          ? "Atualizar"
                          : <><Send className="mr-2 h-4 w-4" />Adicionar e Enviar Convite</>}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending invitations — only orphans (no matching member record) */}
      {isGestor && (() => {
        const orphanInvites = (invitations ?? []).filter(
          inv => !(members ?? []).some(m => m.email.toLowerCase() === inv.email.toLowerCase())
        );
        if (orphanInvites.length === 0) return null;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Clock className="h-4 w-4" />
              Convites sem cadastro na equipe
              <span className="text-xs font-normal text-muted-foreground">({orphanInvites.length})</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Estes colaboradores receberam convite mas ainda não foram adicionados à equipe. Clique em <strong>Adicionar à equipe</strong> para completar o cadastro.
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {orphanInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3"
                >
                  <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
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
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Button
                        size="sm"
                        className="h-7 text-[11px] px-2.5 gap-1"
                        onClick={() => handleAddMemberFromInvite(inv)}
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar à equipe
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                        disabled={resendingInviteId === inv.id || deleteInvitation.isPending}
                        onClick={() => handleResendInvite(inv.id, { name: inv.name, email: inv.email }, inv.intendedRole)}
                      >
                        <RefreshCw className={cn("h-3 w-3", resendingInviteId === inv.id && "animate-spin")} />
                        {resendingInviteId === inv.id ? "Reenviando…" : "Reenviar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRevokeInvite(inv.id, inv.email)}
                        disabled={deleteInvitation.isPending || resendingInviteId === inv.id}
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
        <CardContent>
          <TeamSection team="projetos" members={filtered} isLoading={isLoading} {...cardProps} />
        </CardContent>
      </Card>

      {/* Send invite dialog (for existing members without account) */}
      <Dialog open={!!invitingMember} onOpenChange={(open) => { if (!open) setInvitingMember(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Enviar convite para {invitingMember?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Selecione o papel que <strong>{invitingMember?.name}</strong> terá no sistema. Um e-mail com o link de acesso será enviado para <strong>{invitingMember?.email}</strong>.
          </p>
          <Form {...inviteRoleForm}>
            <form onSubmit={inviteRoleForm.handleSubmit(handleSubmitInvite)} className="space-y-4">
              <FormField control={inviteRoleForm.control} name="intendedRole" render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel no sistema</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
                    </FormControl>
                    <SelectContent><RoleSelectItems /></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createInvitation.isPending} className="w-full">
                  {createInvitation.isPending ? "Enviando..." : <><Send className="mr-2 h-4 w-4" />Enviar Convite</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset password link dialog */}
      <Dialog open={!!resetLinkData} onOpenChange={(open) => { if (!open) { setResetLinkData(null); setCopiedLink(false); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Link de redefinição de senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie o link abaixo para <strong>{resetLinkData?.memberName}</strong>. Ao clicar, ele será conectado ao sistema e poderá redefinir sua senha nas configurações do perfil.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground font-mono truncate select-all">
                {resetLinkData?.url}
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0">
                {copiedLink ? <><Check className="h-3.5 w-3.5 mr-1 text-green-600" />Copiado</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copiar</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              Este link expira em 24 horas e é de uso único.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading overlay while generating link */}
      {resetLinkLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-card rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Gerando link de acesso...</p>
          </div>
        </div>
      )}
    </div>
  );
}
