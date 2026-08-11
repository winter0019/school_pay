export default function EmptyState() {
  return (
    <div className="rounded-xl border p-12 text-center">

      <div className="text-5xl">
        🔍
      </div>

      <h2 className="mt-4 text-xl font-bold">
        No people found
      </h2>

      <p className="mt-2 text-slate-500">
        Try changing your search filters.
      </p>

    </div>
  );
}