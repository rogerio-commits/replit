import { daysFromToday } from "./project-health";

// Datas de obra vencidas — usando a mesma regra do componente ProjectDates:
// uma data ESTIMADA (fim do projeto / fim da produção) só está vencida quando a
// data FINAL correspondente ainda não foi registrada. Preencher a final é o
// sinal de "etapa concluída" — então some do radar sem falso positivo.

export interface OverdueObraDate {
  label: string; // "Fim do projeto" | "Fim da produção"
  date: string; // YYYY-MM-DD
  days: number; // negativo (dias de atraso)
}

interface ObraDatesProject {
  endDate?: string | null;
  finalDate?: string | null;
  producaoEndDate?: string | null;
  producaoFinalDate?: string | null;
  archived?: boolean;
}

/** Datas-chave estimadas já vencidas e ainda sem a data final correspondente. */
export function overdueObraDates(p: ObraDatesProject): OverdueObraDate[] {
  if (p.archived) return [];
  const out: OverdueObraDate[] = [];

  const check = (
    estimada: string | null | undefined,
    final: string | null | undefined,
    label: string,
  ) => {
    if (!estimada || final) return; // sem estimativa, ou já tem final = concluído
    let days: number;
    try {
      days = daysFromToday(estimada);
    } catch {
      return;
    }
    if (!Number.isNaN(days) && days < 0) out.push({ label, date: estimada, days });
  };

  check(p.endDate, p.finalDate, "Fim do projeto");
  check(p.producaoEndDate, p.producaoFinalDate, "Fim da produção");
  return out;
}
