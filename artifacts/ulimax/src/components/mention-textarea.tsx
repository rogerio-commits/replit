import { useRef, useState, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface MentionMember {
  id: number;
  name: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  members: MentionMember[];
}

function getMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return null;
  // Make sure there's no space immediately after @
  const between = before.slice(atIdx + 1);
  if (/\s/.test(between) && between.trim().length > 0) return null;
  return { query: between, start: atIdx };
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  members,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mentionState, setMentionState] = useState<{
    open: boolean;
    query: string;
    atStart: number;
    activeIdx: number;
  }>({ open: false, query: "", atStart: 0, activeIdx: 0 });

  const filtered = members.filter((m) =>
    m.name.toLowerCase().startsWith(mentionState.query.toLowerCase())
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      const cursor = e.target.selectionStart ?? text.length;
      onChange(text);

      const mention = getMentionQuery(text, cursor);
      if (mention && filtered.length > 0) {
        setMentionState((s) => ({
          ...s,
          open: true,
          query: mention.query,
          atStart: mention.start,
          activeIdx: 0,
        }));
      } else {
        setMentionState((s) => ({ ...s, open: false }));
      }
    },
    [onChange, filtered.length]
  );

  const applyMention = useCallback(
    (member: MentionMember) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursor = ta.selectionStart ?? value.length;
      const mention = getMentionQuery(value, cursor);
      if (!mention) return;

      const before = value.slice(0, mention.start);
      const after = value.slice(cursor);
      const newText = `${before}@${member.name} ${after}`;
      onChange(newText);
      setMentionState((s) => ({ ...s, open: false }));

      // Move cursor after inserted mention
      requestAnimationFrame(() => {
        const newPos = mention.start + member.name.length + 2; // '@' + name + ' '
        ta.setSelectionRange(newPos, newPos);
        ta.focus();
      });
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionState.open && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionState((s) => ({
            ...s,
            activeIdx: (s.activeIdx + 1) % filtered.length,
          }));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionState((s) => ({
            ...s,
            activeIdx: (s.activeIdx - 1 + filtered.length) % filtered.length,
          }));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          applyMention(filtered[mentionState.activeIdx]);
          return;
        }
        if (e.key === "Escape") {
          setMentionState((s) => ({ ...s, open: false }));
          return;
        }
      }
      onKeyDown?.(e);
    },
    [mentionState, filtered, applyMention, onKeyDown]
  );

  // Close on outside click
  useEffect(() => {
    if (!mentionState.open) return;
    const handler = (e: MouseEvent) => {
      if (
        !textareaRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setMentionState((s) => ({ ...s, open: false }));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mentionState.open]);

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[72px] text-sm resize-none", className)}
      />

      {mentionState.open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full mb-1 left-0 z-50 w-56 rounded-lg border border-border bg-popover shadow-md overflow-hidden"
        >
          <p className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
            Mencionar membro
          </p>
          <ul className="py-1 max-h-40 overflow-y-auto">
            {filtered.map((m, idx) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors",
                    idx === mentionState.activeIdx
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyMention(m);
                  }}
                  onMouseEnter={() =>
                    setMentionState((s) => ({ ...s, activeIdx: idx }))
                  }
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
