import { Link } from "wouter";
import { HardHat, LayoutDashboard, Kanban, Users, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="border-b border-border/50 bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
          <HardHat className="h-6 w-6" />
          <span>ULIMAX</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Criar Conta</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <HardHat className="h-4 w-4" />
            Sistema de Controle de Projetos
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5 leading-tight">
            Gestão de Projetos para <span className="text-primary">Engenharia</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Acompanhe projetos, tarefas, equipe e status de obra em um só lugar. 
            Do planejamento à instalação, tudo sob controle.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/sign-in">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Entrar no Sistema
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                Criar Conta
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: LayoutDashboard, label: "Dashboard", desc: "Visão geral e métricas" },
              { icon: CheckSquare, label: "Tarefas", desc: "Controle e prazos" },
              { icon: Kanban, label: "Kanban", desc: "Fluxo por etapas" },
              { icon: Users, label: "Equipe", desc: "Membros e cargos" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-card border border-border/50 rounded-xl p-4 text-left hover:shadow-sm transition-shadow">
                <div className="bg-primary/10 rounded-lg p-2 w-fit mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 py-5 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ulimax. Todos os direitos reservados.
      </footer>
    </div>
  );
}
