import { useEffect, useRef } from "react";

type NavigateFn = (to: string) => void;

export function useKeyboardShortcuts(navigate: NavigateFn) {
  const gRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable ||
        e.ctrlKey || e.metaKey || e.altKey
      ) return;

      if (e.key === "g") {
        gRef.current = true;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { gRef.current = false; }, 1500);
        e.preventDefault();
        return;
      }

      if (gRef.current) {
        gRef.current = false;
        clearTimeout(timerRef.current);
        e.preventDefault();
        switch (e.key) {
          case "d": navigate("/dashboard"); break;
          case "t": navigate("/tasks"); break;
          case "p": navigate("/projects"); break;
          case "m": navigate("/members"); break;
          case "k": navigate("/kanban"); break;
          case "c": navigate("/calendario"); break;
          case "a": navigate("/alertas"); break;
          case "l": navigate("/templates"); break;
        }
        return;
      }

      if (e.key === "n") {
        e.preventDefault();
        navigate("/tasks?create=1");
      } else if (e.key === "?") {
        e.preventDefault();
        navigate("/ajuda");
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [navigate]);
}
