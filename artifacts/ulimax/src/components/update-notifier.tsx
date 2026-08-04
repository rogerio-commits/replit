import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CHECK_MS = 5 * 60 * 1000;

// ── Detector de versão nova ──────────────────────────────────────────────────
// Uma aba aberta não troca de código sozinha após um deploy: os dados
// recarregam, o app não. Este componente compara o bundle em execução (script
// injetado no HTML) com o do index.html publicado; quando divergem, avisa e
// oferece recarregar. Checa a cada 5 min e sempre que a aba volta ao foco.

function runningEntry(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]');
  return el?.src.match(/index-[\w-]+\.js/)?.[0] ?? null;
}

async function servedEntry(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/?_v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();
    return html.match(/index-[\w-]+\.js/)?.[0] ?? null;
  } catch {
    return null;
  }
}

export function UpdateNotifier() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const baseline = runningEntry();
    if (!baseline) return; // dev server ou HTML inesperado — não há o que comparar

    let checking = false;
    async function check() {
      if (checking) return;
      checking = true;
      const served = await servedEntry();
      checking = false;
      if (served && served !== baseline) setAvailable(true);
    }

    const interval = setInterval(check, CHECK_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        setDismissed(false); // lembrete gentil ao voltar para a aba
        check();
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  if (!available || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg print:hidden">
      <RefreshCw className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm font-medium text-foreground whitespace-nowrap">Nova versão do app disponível</span>
      <Button size="sm" className="h-7 rounded-full" onClick={() => window.location.reload()}>
        Atualizar
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Agora não"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
