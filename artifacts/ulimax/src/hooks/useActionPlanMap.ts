import { useMemo } from "react";
import { useListActionPlanSummaries } from "@workspace/api-client-react";
import type { ProjectActionPlanSummary } from "@workspace/api-client-react";

/** Resumo de planos de ação indexado por projeto — busca uma vez, usa em vários selos. */
export function useActionPlanMap(): Map<number, ProjectActionPlanSummary> {
  const { data } = useListActionPlanSummaries();
  return useMemo(
    () => new Map((data ?? []).map((s) => [s.projectId, s])),
    [data],
  );
}
