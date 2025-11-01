import { useState, useRef } from "react";
import type { DragEvent } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { uploadDocument } from "../utils/api";
import type { UploadResponse } from "../utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface DocumentUploaderProps {
  onUploadSuccess: (doc: UploadResponse) => void;
  uploadedDocs: UploadResponse[];
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onRemoveDoc: (docId: string) => void;
}

export function DocumentUploader({
  onUploadSuccess,
  uploadedDocs,
  selectedDocId,
  onSelectDoc,
  onRemoveDoc,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.includes("pdf") && !file.type.includes("document")) {
      setError("Please upload a PDF or DOCX file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await uploadDocument(file);
      onUploadSuccess(response);
    } catch (err) {
      setError("Failed to upload document. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            } ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={!isUploading ? handleBrowse : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading}
            />
            
            {isUploading ? (
              <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
            ) : (
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            )}
            
            <p className="text-sm font-medium mb-1">
              {isUploading ? "Uploading..." : "Drop your document here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse (PDF, DOCX)
            </p>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {uploadedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents ({uploadedDocs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploadedDocs.map((doc) => (
              <button
                key={doc.documentId}
                type="button"
                className={`w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDocId === doc.documentId
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "hover:bg-muted border-border"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Document clicked:", doc.documentId);
                  console.log("Current selectedDocId:", selectedDocId);
                  onSelectDoc(doc.documentId);
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <File className="h-5 w-5 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-medium truncate w-full text-left">
                      {doc.filename || "Untitled Document"}
                    </span>
                    {/* {selectedDocId === doc.documentId && (
                      <span className="text-xs opacity-75">Active</span>
                    )} */}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDoc(doc.documentId);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
