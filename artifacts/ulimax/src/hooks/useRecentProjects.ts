import { useEffect, useCallback } from "react";
import { useListProjects } from "@workspace/api-client-react";

const KEY = "ulimax-recent-projects-v1";
const MAX = 5;

export function recordProjectVisit(id: number, name: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: { id: number; name: string }[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((p) => p.id !== id);
    filtered.unshift({ id, name });
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {}
}

export function useRecentProjects() {
  const { data: projects } = useListProjects({});

  const getRecent = useCallback((): { id: number; name: string }[] => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const list: { id: number; name: string }[] = JSON.parse(raw);
      if (!projects) return list;
      return list.filter((r) => projects.some((p) => p.id === r.id));
    } catch {
      return [];
    }
  }, [projects]);

  return getRecent();
}
