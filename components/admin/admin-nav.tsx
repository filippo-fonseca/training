'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavItem } from '@/components/ui/page-shell';
import {
  PlanGlyph,
  LogGlyph,
  HeartPulseGlyph,
  ActivityGlyph,
  ImportGlyph,
  GearGlyph,
} from '@/components/admin/icons';

interface NavDef {
  href: string;
  label: string;
  icon: ReactNode;
  /** Later units own these routes; the link is present but the page may 404 until then. */
  pending?: boolean;
}

const NAV: NavDef[] = [
  { href: '/admin/plan', label: 'Plan', icon: <PlanGlyph /> },
  { href: '/admin/log', label: 'Log', icon: <LogGlyph /> },
  { href: '/admin/health', label: 'Health', icon: <HeartPulseGlyph /> },
  { href: '/admin/strava', label: 'Strava', icon: <ActivityGlyph /> },
  { href: '/admin/import', label: 'Import', icon: <ImportGlyph /> },
  { href: '/admin/settings', label: 'Settings', icon: <GearGlyph /> },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <NavItem key={item.href} href={item.href} icon={item.icon} active={active}>
            {item.label}
          </NavItem>
        );
      })}
    </>
  );
}
