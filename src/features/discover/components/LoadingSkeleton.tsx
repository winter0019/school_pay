export default function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border p-5"
        >
          <div className="h-16 w-16 rounded-full bg-slate-200" />

          <div className="mt-4 h-4 w-40 rounded bg-slate-200" />

          <div className="mt-3 h-3 w-24 rounded bg-slate-200" />

          <div className="mt-5 h-10 rounded bg-slate-200" />
        </div>
      ))}

    </div>
  );
}