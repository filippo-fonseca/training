'use client';

import { usePathname } from 'next/navigation';
import { NavItem, NavRailItem } from '@/components/ui/page-shell';
import { ADMIN_NAV } from '@/components/admin/admin-nav-data';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      {ADMIN_NAV.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          active={isActive(pathname, item.href)}
        >
          {item.label}
        </NavItem>
      ))}
    </>
  );
}

/** Horizontal rail for phones; same destinations as the sidebar. */
export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <>
      {ADMIN_NAV.map((item) => (
        <NavRailItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          active={isActive(pathname, item.href)}
        >
          {item.label}
        </NavRailItem>
      ))}
    </>
  );
}
