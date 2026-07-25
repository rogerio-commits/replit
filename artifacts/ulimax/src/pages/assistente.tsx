import { useEffect, useRef, useState } from "react";
import { useAssistantChat } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sparkles, SendHorizonal, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Assistente inteligente (somente gestor) ──────────────────────────────────
// Chat em português que responde usando os dados atuais do sistema:
// projetos, tarefas, prazos e equipe. A conversa fica só neste navegador
// (sessionStorage) — nada é salvo no servidor.

type ChatMsg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "ulimax-assistente-conversa";

const SUGESTOES = [
  "O que está atrasado hoje?",
  "Como está a carga de trabalho da equipe?",
  "Quais projetos precisam de mais atenção?",
  "O que vence nos próximos 3 dias?",
];

function loadSaved(): ChatMsg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ChatMsg[]) : [];
  } catch {
    return [];
  }
}

export default function Assistente() {
  const [mensagens, setMensagens] = useState<ChatMsg[]>(loadSaved);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState(false);
  const chat = useAssistantChat();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mensagens));
    } catch {
      // sem espaço no storage — segue sem salvar
    }
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, chat.isPending]);

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || chat.isPending) return;
    setErro(false);
    setTexto("");
    const historico: ChatMsg[] = [...mensagens, { role: "user", content: q }];
    setMensagens(historico);
    try {
      const resp = await chat.mutateAsync({ data: { messages: historico.slice(-12) } });
      setMensagens((atual) => [...atual, { role: "assistant", content: resp.reply }]);
    } catch {
      setErro(true);
    }
  }

  function limpar() {
    setMensagens([]);
    setErro(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignora
    }
  }

  const vazio = mensagens.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[420px] max-w-3xl flex-col p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" />
            Assistente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pergunte em português sobre projetos, tarefas, prazos e equipe. As
            respostas usam os dados do sistema neste momento.
          </p>
        </div>
        {!vazio && (
          <Button variant="ghost" size="sm" onClick={limpar} className="shrink-0">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Conversa */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-4">
        {vazio ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Como posso ajudar hoje?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Toque numa sugestão ou escreva sua pergunta abaixo.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void enviar(s)}
                  className="rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {mensagens.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando os dados…
                </div>
              </div>
            )}
            {erro && !chat.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  Não consegui responder agora. Tente novamente em instantes.
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>
        )}
      </div>

      {/* Entrada */}
      <div className="mt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar(texto);
              }
            }}
            rows={2}
            placeholder="Ex.: quais tarefas do João estão atrasadas?"
            className="min-h-[44px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={chat.isPending}
          />
          <Button
            onClick={() => void enviar(texto)}
            disabled={chat.isPending || !texto.trim()}
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Enviar pergunta"
          >
            {chat.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizonal className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          O assistente pode cometer erros — confira informações importantes antes de decidir.
        </p>
      </div>
    </div>
  );
}
