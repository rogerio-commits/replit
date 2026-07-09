import { useState } from "react";
import { Plus, CheckSquare, Briefcase, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export function QuickCreate() {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      label: "Nova Tarefa",
      icon: CheckSquare,
      href: "/tasks?create=1",
      color: "bg-violet-600 hover:bg-violet-700 text-white",
    },
    {
      label: "Novo Projeto",
      icon: Briefcase,
      href: "/projects?create=1",
      color: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  ];

  return (
    <div className="relative">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Radial menu items */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-2 items-end z-50 animate-in slide-in-from-bottom-2 fade-in duration-150">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <button
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all whitespace-nowrap",
                    action.color,
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm",
          open
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        title="Criar novo"
      >
        {open ? (
          <X className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Criar</span>
      </button>
    </div>
  );
}
