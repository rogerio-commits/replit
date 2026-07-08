import { useState, useEffect } from "react";
import { X, Briefcase, CheckSquare, Users, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useAppUser } from "@/hooks/useAppUser";
import { useListProjects, useListTasks, useListMembers } from "@workspace/api-client-react";

const STORAGE_KEY = "ulimax_onboarding_dismissed";

const steps = [
  {
    icon: Briefcase,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Criar um projeto",
    desc: "Projetos → + Novo Projeto",
    href: "/projects",
  },
  {
    icon: CheckSquare,
    color: "text-violet-600",
    bg: "bg-violet-50",
    title: "Adicionar tarefas",
    desc: "Abra um projeto → + Nova Tarefa",
    href: "/projects",
  },
  {
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Convidar a equipe",
    desc: "Equipe → + Novo Membro",
    href: "/members",
  },
];

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(true);
  const { data: me } = useAppUser();
  const { data: projects } = useListProjects({});
  const { data: tasks } = useListTasks();
  const { data: members } = useListMembers();

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (!wasDismissed) setDismissed(false);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed || !me) return null;

  const hasProject = (projects?.length ?? 0) > 0;
  const hasTask = (tasks?.length ?? 0) > 0;
  const hasMembers = (members?.length ?? 0) > 1;

  const completedCount = [hasProject, hasTask, hasMembers].filter(Boolean).length;
  const allDone = completedCount === 3;

  if (allDone) {
    dismiss();
    return null;
  }

  const firstName = me.email.split("@")[0];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl text-white p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white" />
        <div className="absolute -bottom-10 -left-4 w-24 h-24 rounded-full bg-white" />
      </div>

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-yellow-300" />
          <span className="text-xs font-medium text-blue-100">Bem-vindo ao Ulimax</span>
        </div>
        <h2 className="text-base font-bold mb-3">
          Olá, {firstName}! Siga os passos para começar.
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i === 0 ? hasProject : i === 1 ? hasTask : hasMembers;
            return (
              <Link key={i} href={s.href}>
                <div className={`rounded-lg p-3 cursor-pointer transition-all ${done ? "bg-white/10 opacity-70" : "bg-white/15 hover:bg-white/25"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {done
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
                      : <ArrowRight className="h-3.5 w-3.5 text-white/50 shrink-0 mt-0.5" />
                    }
                  </div>
                  <p className={`text-xs font-semibold ${done ? "line-through text-white/50" : "text-white"}`}>{s.title}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{s.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(completedCount / 3) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/70">{completedCount}/3 concluídos</span>
        </div>
      </div>
    </div>
  );
}
