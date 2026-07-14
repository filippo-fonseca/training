import { Panel } from "@/components/ui/panel";

/** A calm placeholder block on the recessed surface. Pulse is reduced-motion-safe. */
function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-sd-input ${className ?? ""}`} />;
}

/** Streaming fallback for the journey while live data resolves (brief loading state). */
export function JourneySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
      {/* Hero */}
      <section className="relative flex flex-col gap-8 rounded-sd-card px-6 py-14 sm:px-10 sm:py-16">
        <div className="flex flex-col gap-4">
          <Bar className="h-3 w-32" />
          <Bar className="h-10 w-3/4 max-w-2xl" />
          <Bar className="h-4 w-2/3 max-w-xl" />
        </div>
        <div className="flex flex-wrap items-end gap-12">
          <div className="flex flex-col gap-2">
            <Bar className="h-3 w-24" />
            <Bar className="h-14 w-28" />
          </div>
          <div className="flex flex-col gap-2">
            <Bar className="h-3 w-20" />
            <Bar className="h-10 w-24" />
          </div>
        </div>
        <Bar className="h-1.5 w-full max-w-xl" />
      </section>

      {/* Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="flex flex-col gap-4 lg:col-span-2">
          <Bar className="h-4 w-40" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-5/6" />
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bar className="h-2.5 w-12" />
                <Bar className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Panel>
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Panel key={i} className="flex flex-col gap-4">
              <Bar className="h-4 w-32" />
              <Bar className="h-8 w-24" />
              <Bar className="h-1.5 w-full" />
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
