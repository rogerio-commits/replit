import { useState } from "react";
import { Tag, Plus, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useListTags,
  useCreateTag,
  useAddTagToTask,
  useRemoveTagFromTask,
  getListTasksQueryKey,
  getGetTaskQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCanEdit } from "@/hooks/useAppUser";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#64748b", "#000000",
];

interface TaskTagsProps {
  taskId: number;
  taskTags: Array<{ id: number; name: string; color: string }>;
}

function TagBadge({ name, color, onRemove, canEdit }: { name: string; color: string; onRemove?: () => void; canEdit?: boolean }) {
  const isLight = isColorLight(color);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}
    >
      {name}
      {canEdit && onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 ml-0.5 -mr-0.5">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function isColorLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export { TagBadge };

export function TaskTags({ taskId, taskTags }: TaskTagsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]);
  const canEdit = useCanEdit();
  const qc = useQueryClient();

  const { data: allTags } = useListTags();
  const createTag = useCreateTag();
  const addTag = useAddTagToTask();
  const removeTag = useRemoveTagFromTask();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
  }

  const existingIds = new Set(taskTags.map((t) => t.id));
  const filtered = (allTags ?? []).filter(
    (t) => !existingIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(tagId: number) {
    await addTag.mutateAsync({ id: taskId, data: { tagId } });
    invalidate();
  }

  async function handleRemove(tagId: number) {
    await removeTag.mutateAsync({ id: taskId, tagId });
    invalidate();
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync({ data: { name, color: newColor } });
    await addTag.mutateAsync({ id: taskId, data: { tagId: tag.id } });
    setNewName("");
    setCreating(false);
    invalidate();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Etiquetas
        </span>
        {canEdit && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <Input
                placeholder="Buscar etiqueta..."
                className="h-7 text-sm mb-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left"
                    onClick={() => { handleAdd(t.id); setOpen(false); }}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                ))}
                {filtered.length === 0 && !creating && (
                  <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma etiqueta encontrada.</p>
                )}
              </div>
              {!creating ? (
                <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs justify-start" onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Criar nova etiqueta
                </Button>
              ) : (
                <div className="mt-2 space-y-2">
                  <Input
                    autoFocus
                    placeholder="Nome da etiqueta"
                    className="h-7 text-sm"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={cn("w-5 h-5 rounded-full border-2 transition-transform hover:scale-110", newColor === c ? "border-foreground scale-110" : "border-transparent")}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewColor(c)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs flex-1" disabled={!newName.trim() || createTag.isPending} onClick={handleCreate}>
                      {createTag.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Criar</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCreating(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {taskTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {taskTags.map((t) => (
            <TagBadge key={t.id} name={t.name} color={t.color} canEdit={canEdit} onRemove={() => handleRemove(t.id)} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pl-1">Nenhuma etiqueta.</p>
      )}
    </div>
  );
}
