import { Fragment } from "react";

interface RenderMentionsProps {
  text: string;
  memberNames: string[];
}

export function RenderMentions({ text, memberNames }: RenderMentionsProps) {
  if (memberNames.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  // Build a regex that matches any @MemberName
  const escaped = memberNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(@(?:${escaped.join("|")}))(?=\\s|$|[^\\w])`, "g");

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Fragment key={`t-${last}`}>{text.slice(last, match.index)}</Fragment>
      );
    }
    parts.push(
      <span
        key={`m-${match.index}`}
        className="font-semibold text-primary rounded px-0.5"
      >
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<Fragment key={`t-end`}>{text.slice(last)}</Fragment>);
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
