import { Plus, CheckSquare, Briefcase, Wrench, CalendarPlus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppUser } from "@/hooks/useAppUser";

const actions = [
  {
    label: "Nova Tarefa",
    icon: CheckSquare,
    href: "/tasks?create=1",
    roles: ["gestor", "gestor_obras", "executor"],
  },
  {
    label: "Novo Projeto",
    icon: Briefcase,
    href: "/projects?create=1",
    roles: ["gestor", "gestor_obras", "executor"],
  },
  {
    label: "Novo Evento de Instalação",
    icon: CalendarPlus,
    href: "/calendario?create=1",
    roles: ["gestor", "gestor_obras", "executor"],
  },
  {
    label: "Nova Assistência Técnica",
    icon: Wrench,
    href: "/assistencia-tecnica?create=1",
    roles: ["gestor", "gestor_obras"],
  },
];

export function QuickCreate() {
  const { data: me } = useAppUser();
  const role = me?.role;
  const visible = actions.filter((a) => !role || a.roles.includes(role));
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Criar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {visible.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem key={action.href} asChild>
              <Link href={action.href} className="flex items-center gap-2 cursor-pointer">
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
