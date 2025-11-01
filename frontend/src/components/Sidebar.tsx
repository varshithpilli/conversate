import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { DocumentUploader } from "./DocumentUploader";
import type { UploadResponse } from "../utils/api";

interface SidebarProps {
  uploadedDocs: UploadResponse[];
  selectedDocId: string | null;
  onUploadSuccess: (doc: UploadResponse) => void;
  onSelectDoc: (docId: string) => void;
  onRemoveDoc: (docId: string) => void;
}

export function Sidebar({
  uploadedDocs,
  selectedDocId,
  onUploadSuccess,
  onSelectDoc,
  onRemoveDoc,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <aside
        className={`flex-shrink-0 border-r bg-card transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? "w-0" : "w-80"
        }`}
      >
        <div className="h-full w-80 flex flex-col">
          <div
            className={`flex-1 overflow-y-auto overflow-x-hidden transition-opacity duration-300 ${
              isCollapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="p-4">
              <DocumentUploader
                onUploadSuccess={onUploadSuccess}
                uploadedDocs={uploadedDocs}
                selectedDocId={selectedDocId}
                onSelectDoc={onSelectDoc}
                onRemoveDoc={onRemoveDoc}
              />
            </div>
          </div>
        </div>
      </aside>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute ${isCollapsed ? 'left-0' : 'left-80'} top-20 z-10 h-12 w-6 rounded-l-none rounded-r-md transition-all duration-300 ease-in-out shadow-md border border-l-0`}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
