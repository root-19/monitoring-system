/** Instant feedback while the next admin page compiles or loads. */
export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="space-y-2">
        <div className="skeleton h-7 w-48 rounded-lg" />
        <div className="skeleton h-4 w-72 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}
