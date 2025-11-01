# 🧠 AI Document Chat — Frontend Specification

A modern dark-mode chat interface built using **Vite + React + Tailwind + Shadcn UI**, featuring a real-time streaming chat with an AI model.
The user can **upload documents**, **chat with the AI** based on those uploads, and **interact with markdown-rendered responses** — all within a minimal, responsive layout.

---

## 🏗️ Project Setup

This frontend assumes:

* Initialized with `vite@latest my-app --template react`
* TailwindCSS configured (`postcss`, `tailwind.config.js`)
* Shadcn UI installed (`npx shadcn@latest init`)
* Dark mode and local storage already integrated via Tailwind’s `darkMode: "class"`

### 📦 Install Dependencies

```bash
npm install react-markdown remark-gfm dompurify marked
```

(Optional: If not installed yet)

```bash
npm install lucide-react class-variance-authority tailwind-variants
```

---

## 🌑 Design Overview

| Feature                | Description                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Dark Mode**          | Default theme; stored in `localStorage` to persist user preference.                               |
| **Header**             | Minimal top bar with site title and optional theme toggle.                                        |
| **Main Layout**        | Chat interface centered on the page; occupies 75% of viewport width.                              |
| **Chat Bubbles**       | AI responses on the **left**, user messages on the **right**.                                     |
| **Markdown Support**   | AI messages rendered with inline markdown (via `react-markdown` + `remark-gfm`).                  |
| **Clipboard Button**   | Each message bubble includes a small “Copy” button.                                               |
| **Streaming Response** | Chat messages stream token-by-token from backend using `ReadableStream`.                          |
| **Chat Input**         | Textbox at the bottom, with Send button disabled while AI is responding.                          |
| **Document Upload**    | Users can upload files to `/upload`; backend parses documents and enables document-specific chat. |
| **Document Selection** | Users can switch between previously uploaded documents.                                           |

---

## 📁 Directory Structure

```
src/
 ┣ components/
 ┃ ┣ Header.tsx
 ┃ ┣ ChatBubble.tsx
 ┃ ┣ ChatInput.tsx
 ┃ ┣ DocumentUploader.tsx
 ┃ ┗ ThemeToggle.tsx
 ┣ pages/
 ┃ ┗ ChatPage.tsx
 ┣ hooks/
 ┃ ┗ useChat.ts
 ┣ utils/
 ┃ ┗ api.ts
 ┣ App.tsx
 ┗ main.tsx
```

---

## 🧩 Component Descriptions

### `Header.tsx`

* Simple top bar with app title (`AI Document Chat`)
* Optional theme toggle button (dark/light)
* Fixed at top with backdrop blur

### `ChatBubble.tsx`

* Displays messages (AI or User)
* Props:

  ```ts
  {
    text: string;
    role: 'user' | 'ai';
  }
  ```
* Renders markdown for AI text using:

  ```tsx
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  ```
* Includes a copy button (uses `navigator.clipboard.writeText`)

### `ChatInput.tsx`

* Textarea with send button
* Props:

  ```ts
  {
    onSend: (message: string) => void;
    disabled?: boolean;
  }
  ```
* Enter key sends message, Shift+Enter creates newline
* Send button disabled while streaming (`disabled={isStreaming}`)

### `DocumentUploader.tsx`

* Drag-and-drop zone and browse button
* Uses existing JS API:

  ```js
  await fetch(`${API_BASE}/upload`, { method: "POST", body: formData })
  ```
* Shows file name after upload
* Enables chat after upload success
* Optional dropdown to switch active document

---

## 💬 Chat Flow

1. User uploads a document → `/upload`
2. Backend returns success → UI enables chat
3. User types a question and clicks “Send”
4. Frontend sends a POST request to:

   ```
   POST /ask
   { "question": "What is the main argument of section 2?" }
   ```
5. Response streamed from backend (`StreamingResponse`), appended token-by-token
6. Once complete, input is re-enabled

---

## 🔄 Streaming Implementation (Frontend)

```ts
async function sendMessage(query) {
  setIsStreaming(true);
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: query }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let resultText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    resultText += decoder.decode(value);
    setMessages((msgs) => [
      ...msgs.slice(0, -1),
      { ...msgs[msgs.length - 1], text: resultText },
    ]);
  }

  setIsStreaming(false);
}
```

---

## 💾 Local Storage Behavior

| Key            | Purpose                                      |
| -------------- | -------------------------------------------- |
| `theme`        | `"dark"` or `"light"` preference             |
| `uploadedDocs` | Stores metadata for uploaded docs (name, id) |
| `selectedDoc`  | Currently active document for chat           |
| `chatHistory`  | (Optional) Store past messages per document  |

---

## 🎨 Tailwind Layout Skeleton

```tsx
<div className="min-h-screen bg-background text-foreground flex flex-col">
  <Header />
  <main className="flex-grow flex justify-center items-center p-6">
    <div className="w-3/4 flex flex-col space-y-4 max-h-[90vh]">
      <div className="flex flex-col space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <ChatBubble key={i} text={msg.text} role={msg.role} />
        ))}
      </div>
      <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  </main>
</div>
```

---

## ⚡ Example Theme Setup (Shadcn + Tailwind)

```tsx
// App.tsx
import { ThemeProvider } from "@/components/theme-provider"
import ChatPage from "@/pages/ChatPage"

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ai-chat-theme">
      <ChatPage />
    </ThemeProvider>
  );
}
```

---

## 🧠 Backend API Summary

| Endpoint     | Method | Description                            |
| ------------ | ------ | -------------------------------------- |
| `/upload`    | `POST` | Uploads document (PDF/DOCX), stores ID |
| `/ask`       | `POST` | Streams AI response for given query    |
| `/summarize` | `POST` | (Optional) Summarizes uploaded file    |
| `/doi`       | `POST` | Extracts DOI information               |

---

## 🚀 Expected Behavior Summary

✅ Fully dark-mode persistent UI
✅ Document upload before chat
✅ Selectable document context
✅ Streaming markdown-rendered chat
✅ Disabled send button while streaming
✅ Copy-to-clipboard on message bubbles
✅ Clean layout centered at 75% width
✅ Shadcn + Tailwind for consistent styling