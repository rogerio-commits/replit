import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none text-sm", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-muted rounded px-3 py-2 text-xs font-mono overflow-x-auto my-2">
                  {children}
                </code>
              );
            }
            return <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
          },
          pre: ({ children }) => <>{children}</>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 pl-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 pl-2">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground my-2">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
