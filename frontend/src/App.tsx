import ChatPage from "./pages/ChatPage"

export default function App() {
  return (
    <div className="min-h-screen w-full bg-black relative">
  {/* Dark White Dotted Grid Background */}
  <div
    className="absolute inset-0 z-0"
    style={{
      // background: "#171717",
      background: "bg-card",
      backgroundImage: `
        radial-gradient(circle, rgba(255, 255, 255, 0.1) 0.5px, transparent 1.5px)
      `,
      backgroundSize: "50px 50px",
      backgroundPosition: "0 0",
    }}
  />
     <ChatPage />
     {/* Your Content/Components */}
</div>

  );
}
