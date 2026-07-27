"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_CONFIG } from "@/lib/roles";

// Internal/external assessors and moderators live under one tabbed shell
// (see app/(assessors)/layout.tsx) — this switches between them without
// leaving the page.
const TABS = [
  ROLE_CONFIG.INTERNAL_ASSESSOR,
  ROLE_CONFIG.EXTERNAL_ASSESSOR,
  ROLE_CONFIG.MODERATOR,
];

export function AssessorTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex flex-wrap gap-4">
        {TABS.map((tab) => {
          const active = pathname === tab.route;
          return (
            <Link
              key={tab.route}
              href={tab.route}
              className={`border-b-2 px-1 py-2.5 text-sm font-medium ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.plural}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
