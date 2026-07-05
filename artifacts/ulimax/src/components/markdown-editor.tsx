import { useState } from "react";
import { Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "./markdown-renderer";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MarkdownEditor({ value, onChange, placeholder, className, rows = 4 }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-6 px-2 text-xs gap-1", !preview && "text-primary bg-primary/10")}
          onClick={() => setPreview(false)}
        >
          <Edit3 className="h-3 w-3" /> Editar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-6 px-2 text-xs gap-1", preview && "text-primary bg-primary/10")}
          onClick={() => setPreview(true)}
        >
          <Eye className="h-3 w-3" /> Pré-visualizar
        </Button>
      </div>
      {preview ? (
        <div className="min-h-[80px] rounded-md border bg-muted/30 px-3 py-2">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem conteúdo.</p>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Suporta **negrito**, *itálico*, `código`, listas e links."}
          rows={rows}
          className="text-sm font-mono resize-y"
        />
      )}
      {!preview && (
        <p className="text-[10px] text-muted-foreground">Suporta Markdown: **negrito**, *itálico*, `código`, - listas</p>
      )}
    </div>
  );
}
