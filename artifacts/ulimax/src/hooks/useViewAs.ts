import { useSyncExternalStore } from "react";
import { useAppUser } from "./useAppUser";

export type SystemRole = "gestor" | "gestor_obras" | "executor" | "observador";

// "Ver como": deixa um gestor pré-visualizar o app com o menu e o acesso de
// outro papel. É só apresentação no cliente — as permissões reais continuam no
// servidor (o gestor segue com acesso total à API). Persistido no navegador.
const KEY = "ulimax:viewAs";

function read(): SystemRole | null {
  try {
    return (localStorage.getItem(KEY) as SystemRole | null) || null;
  } catch {
    return null;
  }
}

let current: SystemRole | null = read();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setViewAs(role: SystemRole | null): void {
  current = role;
  try {
    if (role) localStorage.setItem(KEY, role);
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage indisponível — segue só em memória */
  }
  listeners.forEach((l) => l());
}

/** Papel escolhido para pré-visualização (bruto; só faz efeito para gestor real). */
export function useViewAs(): SystemRole | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Papel efetivo: o "Ver como" quando o usuário real é gestor; senão, o papel real. */
export function useEffectiveRole(): SystemRole | undefined {
  const { data: me } = useAppUser();
  const viewAs = useViewAs();
  const real = me?.role as SystemRole | undefined;
  return real === "gestor" && viewAs ? viewAs : real;
}

/** Verdadeiro só quando o usuário logado é, de fato, gestor. */
export function useIsRealGestor(): boolean {
  const { data: me } = useAppUser();
  return me?.role === "gestor";
}
