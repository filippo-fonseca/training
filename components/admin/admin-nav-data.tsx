import type { ReactNode } from 'react';
import {
  PlanGlyph,
  LogGlyph,
  HeartPulseGlyph,
  ActivityGlyph,
  ImportGlyph,
  GearGlyph,
} from '@/components/admin/icons';

/** Shared admin section model: sidebar, mobile rail, and overview cards. */
export interface AdminNavDef {
  href: string;
  label: string;
  desc: string;
  icon: ReactNode;
}

export const ADMIN_NAV: AdminNavDef[] = [
  {
    href: '/admin/plan',
    label: 'Plan',
    desc: 'Edit phases, weeks, days, and sessions.',
    icon: <PlanGlyph />,
  },
  {
    href: '/admin/log',
    label: 'Log',
    desc: 'Record daily outcomes against the plan.',
    icon: <LogGlyph />,
  },
  {
    href: '/admin/health',
    label: 'Health',
    desc: 'Track readiness and recovery notes.',
    icon: <HeartPulseGlyph />,
  },
  {
    href: '/admin/strava',
    label: 'Strava',
    desc: 'Sync runs and link them to plan days.',
    icon: <ActivityGlyph />,
  },
  {
    href: '/admin/import',
    label: 'Import',
    desc: 'Load a plan from structured JSON.',
    icon: <ImportGlyph />,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    desc: 'Owner account and app info.',
    icon: <GearGlyph />,
  },
];
