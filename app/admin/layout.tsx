export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[430px] md:max-w-6xl">{children}</div>
  );
}
