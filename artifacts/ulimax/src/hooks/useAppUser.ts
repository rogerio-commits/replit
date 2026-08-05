import { useGetMe } from "@workspace/api-client-react";

export function useAppUser() {
  return useGetMe({ query: { staleTime: 5 * 60 * 1000, queryKey: ["/api/me"] } });
}

export function useIsGestor(): boolean {
  const { data } = useAppUser();
  return data?.role === "gestor";
}

export function useCanEdit(): boolean {
  const { data } = useAppUser();
  return data?.role === "gestor" || data?.role === "executor" || data?.role === "gestor_obras" || data?.role === "projetista_gestor";
}
