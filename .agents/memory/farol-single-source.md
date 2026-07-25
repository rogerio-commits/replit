---
name: Farol como fonte única de saúde/urgência
description: Qualquer tela nova que mostre saúde ou urgência de projeto deve derivar de lib/project-health; nunca reimplementar regras próprias.
---

**Regra:** toda exibição de saúde/urgência de projeto (cores, ordenação "onde focar", motivos) deriva de `lib/project-health` (farol + attentionScore) e rótulos de fase de `lib/project-status`.

**Why:** a página Portfólio original tinha regras de saúde próprias e chaves de enum obsoletas (status com hífen, prioridades "alta/normal/baixa" inexistentes) — contradizia o farol do Dashboard/Kanban e mostrava rótulos crus. Foi reescrita como "Painel de Projetos" (rota `/portfolio` mantida) justamente para eliminar isso.

**How to apply:** ao criar/editar telas com saúde, prioridade de atenção ou fases: importar de `@/lib/project-health` e `@/lib/project-status`. Ordenação de atenção deve ser severidade-primeiro — a parte variável do `attentionScore` é limitada abaixo do degrau entre níveis (🟡 nunca acima de 🔴); manter essa invariante em qualquer ajuste. Enums reais: status com underscore (6 fases, sem "concluido" no banco), prioridade low/medium/high.
