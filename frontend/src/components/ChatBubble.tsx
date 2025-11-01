import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface ChatBubbleProps {
  text: string;
  role: "user" | "ai";
  isStreaming?: boolean;
}

export function ChatBubble({ text, role, isStreaming = false }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAI = role === "ai";

  return (
    <div className={`flex ${isAI ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`group relative max-w-[80%] rounded-2xl px-3 py-2 ${
          isAI
            ? "bg-[#1c1c1f] text-gray-100"
            : "bg-[#1c1c1f] text-gray-100"
        }`}
      >
        {isAI ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || " "}</ReactMarkdown>
            {isStreaming && !text && (
              <Loader2 className="h-4 w-4 animate-spin inline-block" />
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{text}</p>
        )}
        
        {text && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-white border-gray-500 shadow-sm"
            title="Copy message"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-gray-300 group-hover:text-gray-800" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
