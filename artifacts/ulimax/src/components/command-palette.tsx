import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Briefcase, CheckSquare, Users, LayoutDashboard, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useListProjects } from "@workspace/api-client-react";
import { useListTasks } from "@workspace/api-client-react";
import { useListMembers } from "@workspace/api-client-react";

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
  done: "Concluída",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();
  const { data: members } = useListMembers();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(path: string) {
    setOpen(false);
    setLocation(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar projetos, tarefas, membros..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Páginas">
          <CommandItem onSelect={() => go("/")} className="gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")} className="gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Projetos
          </CommandItem>
          <CommandItem onSelect={() => go("/tasks")} className="gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            Tarefas
          </CommandItem>
          <CommandItem onSelect={() => go("/members")} className="gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Equipe
          </CommandItem>
        </CommandGroup>

        {projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projetos">
              {projects.slice(0, 8).map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)} className="gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.name}</span>
                  {p.status && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{p.status}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tasks && tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tarefas">
              {tasks.slice(0, 8).map((t) => (
                <CommandItem key={t.id} value={`${t.title} ${t.projectName ?? ""}`} onSelect={() => go("/tasks")} className="gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{t.title}</span>
                    {t.projectName && (
                      <span className="text-xs text-muted-foreground truncate">{t.projectName}</span>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {TASK_STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {members && members.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Membros">
              {members.slice(0, 5).map((m) => (
                <CommandItem key={m.id} onSelect={() => go("/members")} className="gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{m.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{m.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t px-3 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Search className="h-3 w-3" /> Busca global
        </span>
        <span className="ml-auto flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> navegar
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] ml-1">↵</kbd> abrir
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] ml-1">esc</kbd> fechar
        </span>
      </div>
    </CommandDialog>
  );
}
