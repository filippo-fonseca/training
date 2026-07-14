import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/design/cn";
import { BoldAmbient } from "@/components/ui/bold-ambient";

/**
 * PageShell — the app-shell layout (brief §8): translucent darkest sidebar on
 * the left, an .sd-topbar-blur toolbar, an --sd-app canvas content area, and a
 * whisper ambient glow fixed behind the whole shell. Bold ambient belongs to
 * hero/dashboard content, not the shell.
 */
export interface PageShellProps {
  /** Sidebar content below the brand (typically a stack of <NavItem>). */
  nav?: ReactNode;
  /** Brand lockup at the top of the sidebar. */
  brand?: ReactNode;
  /** Toolbar content (breadcrumbs, actions). */
  topbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({
  nav,
  brand,
  topbar,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("relative min-h-dvh", className)}>
      {/* Whisper ambient behind the entire shell */}
      <BoldAmbient whisper fixed />

      <div className="relative z-10 flex min-h-dvh">
        {/* Sidebar — darkest surface, translucent over canvas */}
        <aside className="sd-sidebar-surface hidden w-60 shrink-0 flex-col md:flex">
          <div className="flex h-14 items-center px-4">
            {brand ?? <DefaultBrand />}
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
            {nav}
          </nav>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sd-topbar-blur sticky top-0 z-20 flex h-14 items-center gap-3 px-5">
            {topbar}
          </header>
          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

/** A single sidebar nav row. Selection is the two-tier law: neutral backplate,
 *  accent tint on the LABEL only, never an accent ring around the row. */
export interface NavItemProps {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
}

export function NavItem({ href, icon, children, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "sd-lift relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
        active
          ? "bg-sd-selected-item text-sd-accent-faint"
          : "text-sd-ink-dull hover:bg-sd-hover hover:text-sd-ink",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="sd-nav-indicator absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-sd-accent"
          style={{ boxShadow: "0 0 8px var(--hud-cyan-glow)" }}
        />
      ) : null}
      {icon ? (
        <span className={cn("shrink-0", active ? "text-sd-accent" : "text-sd-ink-faint")}>
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function DefaultBrand() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid size-6 place-items-center rounded-md"
        style={{
          background:
            "linear-gradient(160deg, var(--sd-accent-faint), var(--sd-accent-deep))",
          boxShadow: "var(--sd-bevel), 0 0 16px var(--hud-cyan-glow)",
        }}
      >
        <span
          className="size-2 rounded-full"
          style={{ background: "var(--sd-accent-ink)" }}
        />
      </span>
      <span className="sd-numeral text-sm font-semibold tracking-tight text-sd-ink">
        Training
      </span>
    </div>
  );
}
