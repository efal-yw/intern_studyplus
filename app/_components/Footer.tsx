"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "../_lib/navigation";

export default function Footer() {
  const pathname = usePathname();

  return (
    <footer className="sticky bottom-0 z-10 flex shrink-0 border-t border-black/[.08] bg-white">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center py-3 text-sm ${
              active ? "font-semibold text-black" : "text-zinc-500"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </footer>
  );
}
