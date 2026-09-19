"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUTH_PATH, NAV_ITEMS } from "../_lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === AUTH_PATH) {
    return null;
  }

  return (
    <nav className="sticky top-0 flex w-[30%] h-dvh shrink-0 flex-col border-r border-black/[.08] bg-white">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-3 text-sm ${
              active ? "font-semibold text-black" : "text-zinc-500"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
