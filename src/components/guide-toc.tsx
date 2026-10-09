"use client";

import { useEffect, useState } from "react";

export type TocItem = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

// How far below the top of the viewport a heading must pass before its entry
// counts as the one being read. Clears the sticky mobile bar, with slack over
// the targets' scroll-margin (scroll-mt-24 = 96px) so a jumped-to heading
// registers despite sub-pixel rounding.
const ACTIVE_OFFSET_PX = 120;

function flatten(items: TocItem[]) {
  return items.flatMap((item) => [
    { id: item.id, label: item.label, depth: 0 },
    ...(item.children ?? []).map((c) => ({ ...c, depth: 1 })),
  ]);
}

/**
 * Table of contents for the guide: a sticky list on wide screens, a sticky
 * dropdown on phones. Both highlight the section currently being read.
 */
export function GuideToc({ items }: { items: TocItem[] }) {
  const flat = flatten(items);
  const [active, setActive] = useState(flat[0]?.id ?? "");

  useEffect(() => {
    const ids = flatten(items).map((i) => i.id);
    let frame = 0;

    // The last heading scrolled past the offset is the one being read.
    const update = () => {
      frame = 0;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET_PX) {
          current = id;
        }
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <>
      {/* Phones and tablets: a dropdown. The page makes its wrapper sticky,
          since a sticky element only sticks within its own parent. */}
      <div className="-mx-4 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <label
          htmlFor="guide-toc-select"
          className="mb-0.5 block text-[11px] font-medium text-gray-500"
        >
          On this page
        </label>
        <select
          id="guide-toc-select"
          value={active}
          onChange={(e) => {
            window.location.hash = e.target.value;
          }}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {flat.map((item) => (
            <option key={item.id} value={item.id}>
              {item.depth === 1 ? `   — ${item.label}` : item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Wide screens: a sticky list beside the content. */}
      <nav
        aria-label="Guide contents"
        className="sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-y-auto pb-6 lg:block"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          On this page
        </p>
        <ul className="space-y-0.5 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <TocLink id={item.id} label={item.label} active={active} />
              {item.children && (
                <ul className="mb-1 ml-3 space-y-0.5 border-l border-gray-200 pl-2">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <TocLink
                        id={child.id}
                        label={child.label}
                        active={active}
                        small
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function TocLink({
  id,
  label,
  active,
  small,
}: {
  id: string;
  label: string;
  active: string;
  small?: boolean;
}) {
  const isActive = id === active;
  return (
    <a
      href={`#${id}`}
      aria-current={isActive ? "location" : undefined}
      className={`block rounded-md px-2 py-1 ${small ? "text-xs" : "font-medium"} ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
    </a>
  );
}
