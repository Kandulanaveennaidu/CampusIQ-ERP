export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted dark:bg-card rounded" />
          <div className="h-4 w-72 bg-muted dark:bg-card rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted dark:bg-card rounded-lg" />
          <div className="h-10 w-32 bg-muted dark:bg-card rounded-lg" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border bg-card p-4"
          >
            <div className="h-4 w-20 bg-muted dark:bg-card rounded" />
            <div className="h-8 w-16 bg-muted dark:bg-card rounded mt-3" />
            <div className="h-3 w-28 bg-muted dark:bg-card rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 p-4 border-b border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 flex-1 bg-muted dark:bg-card rounded" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 border-b border-border last:border-0"
          >
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 bg-muted rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
