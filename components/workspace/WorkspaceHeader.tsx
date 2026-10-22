export function WorkspaceHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-300">{description}</p>
    </header>
  );
}
