import { Link, useLocation } from "wouter";
import { HardHat, Wrench, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/obra",
    label: "Central da Obra",
    sublabel: "visão geral",
    icon: HardHat,
    iconCls: "text-amber-500",
  },
  {
    href: "/assistencia-tecnica",
    label: "Assistência Técnica",
    sublabel: "chamados de clientes",
    icon: Wrench,
    iconCls: "text-orange-500",
  },
  {
    href: "/controle-amostras",
    label: "Amostras",
    sublabel: "prazos e entregas",
    icon: FlaskConical,
    iconCls: "text-violet-500",
  },
] as const;

export function ObraNav() {
  const [location] = useLocation();

  return (
    <nav
      aria-label="Módulos da Obra"
      className="flex items-stretch gap-1 rounded-xl border bg-muted/40 p-1"
    >
      {TABS.map(({ href, label, sublabel, icon: Icon, iconCls }) => {
        const active = location === href || location.startsWith(href + "?");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
              active
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? iconCls : "text-muted-foreground/70")} />
            <span className="min-w-0">
              <span className="block truncate leading-tight">{label}</span>
              <span className="block truncate text-[11px] font-normal text-muted-foreground leading-tight mt-0.5">
                {sublabel}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
