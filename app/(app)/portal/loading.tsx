/** Instant feedback while the next portal page compiles or loads. */
export default function PortalLoading() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="space-y-2">
        <div className="skeleton h-7 w-40 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      <div className="skeleton h-40 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}
