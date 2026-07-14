import Link from "next/link";
import { BoldAmbient } from "@/components/ui/bold-ambient";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <BoldAmbient focal />
      <div className="sd-enter relative z-10 flex flex-col items-center gap-6">
        <span className="sd-stat-label">Training Tracker</span>
        <h1 className="sd-punch max-w-2xl text-balance text-4xl font-bold tracking-tight text-sd-ink sm:text-5xl">
          A precision instrument panel for the long build.
        </h1>
        <p className="max-w-md text-pretty text-sd-ink-dull">
          An open-source tracker for structured endurance plans. The first
          journey: a comeback to the Baystate Half, October 2026.
        </p>
        <Link
          href="/design"
          className="sd-btn sd-btn-primary mt-2"
        >
          View design system
        </Link>
      </div>
    </main>
  );
}
