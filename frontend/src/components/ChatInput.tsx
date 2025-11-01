import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "./ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  console.log("ChatInput disabled state:", disabled); // Debug log

  return (
    <div className="border-t bg-background p-4 w-full">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Please select a document to start chatting..."
              : "Ask a question about your document..."
          }
          disabled={disabled}
          className="flex-1 min-h-[48px] max-h-[150px] px-4 py-2 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          size="icon"
          className="h-[48px] w-[48px]"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
