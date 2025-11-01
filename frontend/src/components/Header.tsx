export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/50 backdrop-blur-sm bg-card supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center justify-center px-6">
        <h1 className="text-3xl font-light tracking-wide text-zinc-100 dm-serif-text-regular">
          Conversate
        </h1>
      </div>
    </header>
  );
}
