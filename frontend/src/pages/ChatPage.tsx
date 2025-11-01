import { useState, useEffect, useRef } from "react";
import { Header } from "../components/Header";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { Sidebar } from "../components/Sidebar";
import { useChat } from "../hooks/useChat";
import type { UploadResponse } from "../utils/api";

export default function ChatPage() {
  const { messages, isStreaming, selectedDocumentId, setSelectedDocumentId, sendMessage } = useChat();
  const [uploadedDocs, setUploadedDocs] = useState<UploadResponse[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug log to check states
  useEffect(() => {
    console.log("ChatPage state:", {
      selectedDocumentId,
      selectedDocIdType: typeof selectedDocumentId,
      selectedDocIdTruthy: !!selectedDocumentId,
      uploadedDocsCount: uploadedDocs.length,
      isStreaming,
      shouldDisableInput: isStreaming || !selectedDocumentId
    });
  }, [selectedDocumentId, uploadedDocs, isStreaming]);

  // Load uploaded docs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("uploadedDocs");
    if (stored) {
      const docs = JSON.parse(stored);
      setUploadedDocs(docs);
      
      const selectedDoc = localStorage.getItem("selectedDoc");
      if (selectedDoc) {
        console.log("Loading selected doc from localStorage:", selectedDoc);
        setSelectedDocumentId(selectedDoc);
      } else if (docs.length > 0) {
        console.log("Auto-selecting first doc:", docs[0].documentId);
        setSelectedDocumentId(docs[0].documentId);
      }
    }
  }, [setSelectedDocumentId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUploadSuccess = (doc: UploadResponse) => {
    console.log("Upload success:", doc); // Debug log
    const updatedDocs = [...uploadedDocs, doc];
    setUploadedDocs(updatedDocs);
    localStorage.setItem("uploadedDocs", JSON.stringify(updatedDocs));
    
    // Auto-select the newly uploaded document
    setSelectedDocumentId(doc.documentId);
    localStorage.setItem("selectedDoc", doc.documentId);
    console.log("Selected document:", doc.documentId); // Debug log
  };

  const handleSelectDoc = (docId: string) => {
    console.log("=== handleSelectDoc START ===");
    console.log("Received docId:", docId, "Type:", typeof docId);
    console.log("Current selectedDocumentId:", selectedDocumentId);
    
    // Ensure docId is a valid string
    if (docId && typeof docId === 'string') {
      setSelectedDocumentId(docId);
      localStorage.setItem("selectedDoc", docId);
      console.log("Set selectedDocumentId to:", docId);
    } else {
      console.error("Invalid docId received:", docId);
    }
    console.log("=== handleSelectDoc END ===");
  };

  const handleRemoveDoc = (docId: string) => {
    const updatedDocs = uploadedDocs.filter((doc) => doc.documentId !== docId);
    setUploadedDocs(updatedDocs);
    localStorage.setItem("uploadedDocs", JSON.stringify(updatedDocs));
    
    if (selectedDocumentId === docId) {
      const newSelectedId = updatedDocs[0]?.documentId || null;
      setSelectedDocumentId(newSelectedId);
      if (newSelectedId) {
        localStorage.setItem("selectedDoc", newSelectedId);
      } else {
        localStorage.removeItem("selectedDoc");
      }
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header />
      
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar
          uploadedDocs={uploadedDocs}
          selectedDocId={selectedDocumentId}
          onUploadSuccess={handleUploadSuccess}
          onSelectDoc={handleSelectDoc}
          onRemoveDoc={handleRemoveDoc}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {uploadedDocs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div className="space-y-4">
                <p className="text-xl font-medium text-muted-foreground">
                  Upload a document to start chatting
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload a PDF or DOCX file to ask questions and get AI-powered insights
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                <div className="max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          Start by asking a question about your document
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Selected: {selectedDocumentId || "None"} | Disabled: {String(isStreaming || !selectedDocumentId)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => (
                        <ChatBubble
                          key={i}
                          text={msg.text}
                          role={msg.role}
                          isStreaming={isStreaming && i === messages.length - 1}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <ChatInput
                  onSend={sendMessage}
                  disabled={isStreaming || !selectedDocumentId}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
