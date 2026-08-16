"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "../_lib/navigation";

export default function Header() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => item.href === pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-black/[.08] bg-white">
      <h1 className="text-base font-semibold text-black">
        {current?.label ?? ""}
      </h1>
    </header>
  );
}
