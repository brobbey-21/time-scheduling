export default function RootLoading() {
  return (
    <main className="px-5 pt-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-[var(--border)]" />
        <div className="h-32 rounded-2xl bg-[var(--border)]" />
        <div className="h-24 rounded-2xl bg-[var(--border)]" />
        <div className="h-24 rounded-2xl bg-[var(--border)]" />
      </div>
    </main>
  );
}
