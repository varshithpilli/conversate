const API_BASE = "http://13.220.174.139:8000";

export interface UploadResponse {
  success: boolean;
  documentId?: string;
  filename?: string;
  result?: any;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload document (${response.status})`);
    }
    
    const data = await response.json();
    console.log("Upload response:", data);
    
    // ✅ Now backend returns document_id
    return {
      success: data.status === "ok",
      documentId: data.document_id, // Use the actual document_id from backend
      filename: data.result?.filename || file.name,
      result: data.result || null,
    };
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error("Failed to upload document. Please try again.");
  }
}

export interface AskRequest {
  document_id: string;
  question: string;
}

export async function askQuestion(request: AskRequest): Promise<Response> {
  console.log("Sending request:", request); // Debug log
  
  const response = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "text/plain", // Since we're receiving a stream
    },
    body: JSON.stringify({
      document_id: request.document_id,
      question: request.question,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error response:", errorText); // Debug log
    throw new Error(`Failed to send question: ${errorText}`);
  }

  return response;
}

// ✅ Removed summarizeDocument function since /summarize endpoint no longer exists
// You can now use askQuestion with a summarization prompt instead

export async function extractDOI(documentId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/doi?document_id=${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract DOI: ${errorText}`);
  }

  const data = await response.json();
  return data.doi || "No DOI detected";
}

// ✅ Optional: Helper function to get a summary using the /ask endpoint
export async function summarizeDocument(documentId: string): Promise<Response> {
  return askQuestion({
    document_id: documentId,
    question: "Please provide a concise summary of this research document, highlighting the main objectives, methods, results, and conclusions.",
  });
}