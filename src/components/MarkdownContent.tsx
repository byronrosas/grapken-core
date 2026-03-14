import { useState, useMemo } from "react";
import { marked } from "marked";
import { Edit3, Eye } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  onChange: (content: string) => void;
  widgetWidth: number;
  widgetHeight: number;
}

export function MarkdownContent({
  content,
  onChange,
  widgetHeight,
}: MarkdownContentProps) {
  const [isEditing, setIsEditing] = useState(true);

  const textareaHeight = Math.max(60, widgetHeight - 100);

  const htmlContent = useMemo(() => {
    if (!content.trim()) return '';
    try {
      return marked.parse(content, { breaks: true, gfm: true });
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="h-full flex flex-col">
      {/* Toggle buttons */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={e => { e.stopPropagation(); setIsEditing(true); }}
          className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1 ${
            isEditing
              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
          }`}
        >
          <Edit3 size={10} /> Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); setIsEditing(false); }}
          className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1 ${
            !isEditing
              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
          }`}
        >
          <Eye size={10} /> Preview
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <textarea
            value={content}
            onChange={e => onChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ height: textareaHeight }}
            className="w-full bg-neutral-950/50 border border-neutral-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none font-mono text-neutral-300"
            placeholder={`# Write your notes here...\n\n- Use markdown syntax\n- Create lists, headers, etc.`}
          />
        ) : (
          <div
            className="prose prose-invert prose-xs max-w-none overflow-auto text-neutral-300"
            style={{ height: textareaHeight, maxHeight: textareaHeight }}
            dangerouslySetInnerHTML={{ __html: htmlContent as string }}
          />
        )}
      </div>
    </div>
  );
}
