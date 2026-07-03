import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Briefcase, CheckSquare, Users, LayoutDashboard, Search, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSearch, getSearchQueryKey } from "@workspace/api-client-react";

const KIND_ICONS = {
  project: Briefcase,
  task: CheckSquare,
  member: Users,
};

const KIND_LABELS = {
  project: "Projetos",
  task: "Tarefas",
  member: "Membros",
};

const KIND_PATHS: Record<string, (id: number) => string> = {
  project: (id) => `/projects/${id}`,
  task: () => `/tasks`,
  member: () => `/members`,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

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

  const searching = debouncedQuery.trim().length > 0;
  const searchParams = { q: debouncedQuery.trim(), limit: 20 };
  const { data: results, isFetching } = useSearch(searchParams, {
    query: { enabled: searching, queryKey: getSearchQueryKey(searchParams) },
  });

  function go(path: string) {
    setOpen(false);
    setLocation(path);
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setQuery("");
      setDebouncedQuery("");
    }
  }

  const grouped = useCallback(() => {
    if (!results) return {} as Record<string, typeof results>;
    return results.reduce((acc, r) => {
      (acc[r.kind] ??= []).push(r);
      return acc;
    }, {} as Record<string, typeof results>);
  }, [results])();

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Buscar projetos, tarefas, membros..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!searching && (
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
        )}

        {searching && isFetching && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando...
          </div>
        )}

        {searching && !isFetching && (!results || results.length === 0) && (
          <CommandEmpty>Nenhum resultado para "{debouncedQuery}".</CommandEmpty>
        )}

        {searching && !isFetching && results && results.length > 0 && (
          <>
            {(["project", "task", "member"] as const).map((kind) => {
              const items = grouped[kind];
              if (!items || items.length === 0) return null;
              const Icon = KIND_ICONS[kind];
              return (
                <div key={kind}>
                  <CommandSeparator />
                  <CommandGroup heading={KIND_LABELS[kind]}>
                    {items.map((item) => (
                      <CommandItem
                        key={`${item.kind}-${item.id}`}
                        value={`${item.title} ${item.subtitle ?? ""}`}
                        onSelect={() => go(KIND_PATHS[item.kind](item.id))}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                          )}
                        </div>
                        {item.meta && (
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.meta}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}
          </>
        )}
      </CommandList>

      <div className="border-t px-3 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Search className="h-3 w-3" />
          {searching ? `Buscando por "${debouncedQuery}"` : "Busca global"}
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
