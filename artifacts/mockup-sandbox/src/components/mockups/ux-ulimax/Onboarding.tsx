import { CheckCircle2, Briefcase, CheckSquare, Users, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Briefcase,
    color: "bg-blue-100 text-blue-600",
    title: "Criar um projeto",
    desc: "Acesse Projetos → + Novo Projeto. Preencha nome, material e datas.",
  },
  {
    icon: CheckSquare,
    color: "bg-violet-100 text-violet-600",
    title: "Adicionar tarefas",
    desc: "Dentro do projeto, clique em + Nova Tarefa e atribua a um colega.",
  },
  {
    icon: Users,
    color: "bg-emerald-100 text-emerald-600",
    title: "Convidar a equipe",
    desc: "Em Equipe → + Novo Membro, preencha o e-mail e o papel no sistema.",
  },
];

export function Onboarding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-10 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium text-blue-100">Bem-vindo ao sistema</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Olá, Ana Flavia 👋</h1>
            <p className="text-blue-100 text-sm">Siga os passos abaixo para começar a usar o Ulimax.</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Primeiros passos</p>
            {steps.map((s, i) => {
              const Icon = s.icon;
              const done = i < 1;
              return (
                <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${done ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 shadow-sm"}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${done ? "line-through text-slate-400" : "text-slate-800"}`}>{s.title}</p>
                      {done && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                  {!done && (
                    <button className="mt-1 shrink-0 h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-8 pb-6">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700"><span className="font-semibold">Dúvidas?</span> Acesse a página Ajuda no menu lateral.</p>
              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">1 de 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
