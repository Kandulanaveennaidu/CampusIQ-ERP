export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-3" />
            <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="h-4 flex-1 bg-gray-100 dark:bg-gray-800 rounded"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
