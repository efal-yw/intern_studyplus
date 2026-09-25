"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { AUTH_PATH, NAV_ITEMS } from "../_lib/navigation";

export default function Sidebar({
  avatarPath,
}: {
  /** users.avatar_path の値。未ログイン/未設定なら null */
  avatarPath: string | null;
}) {
  const pathname = usePathname();

  if (pathname === AUTH_PATH) {
    return null;
  }

  return (
    <nav className="sticky top-0 flex items-center h-dvh w-[20%] shrink-0 flex-col border-r border-black/[.08] bg-white">
      <Link href="./mypage" className="p-2">
        <Avatar avatarPath={avatarPath} />
      </Link>
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
