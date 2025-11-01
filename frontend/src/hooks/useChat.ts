import { useState, useCallback, useEffect } from "react";
import { askQuestion } from "../utils/api";

export interface Message {
  text: string;
  role: "user" | "ai";
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Debug log whenever selectedDocumentId changes
  useEffect(() => {
    console.log("selectedDocumentId changed:", selectedDocumentId);
    console.log("Type of selectedDocumentId:", typeof selectedDocumentId);
  }, [selectedDocumentId]);

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim()) return;

    console.log("Sending message with documentId:", selectedDocumentId);

    // Add user message
    setMessages((prev) => [...prev, { text: query, role: "user" }]);

    // Add empty AI message for streaming
    setMessages((prev) => [...prev, { text: "", role: "ai" }]);

    setIsStreaming(true);

    try {
      const response = await askQuestion({
        question: query,
        document_id: selectedDocumentId || "",  // ✅ Use document_id, not documentId
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let resultText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resultText += decoder.decode(value, { stream: true });

        setMessages((msgs) => [
          ...msgs.slice(0, -1),
          { text: resultText, role: "ai" },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((msgs) => [
        ...msgs.slice(0, -1),
        { text: "Sorry, an error occurred. Please try again.", role: "ai" },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [selectedDocumentId]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    selectedDocumentId,
    setSelectedDocumentId,
    sendMessage,
    clearChat,
  };
}
