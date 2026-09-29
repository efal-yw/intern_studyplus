"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { AUTH_PATH, NAV_ITEMS } from "../_lib/navigation";

export default function Sidebar({
  avatarPath,
  user,
}: {
  /** users.avatar_path の値。未ログイン/未設定なら null */
  avatarPath: string | null;
  user: { id: string; name: string } | null;
}) {
  const pathname = usePathname();

  if (pathname === AUTH_PATH) {
    return null;
  }

  return (
    <nav className="sticky top-0 flex items-center h-dvh w-[20%] shrink-0 flex-col border-r border-black/[.08] bg-white ">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-3 text-xl ${
              active ? "font-semibold text-black" : "text-zinc-500"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <Link href="./mypage" className="p-2 flex fixed bottom-0">
        <Avatar avatarPath={avatarPath} />
        {user && (
          <div className="flex-colshrink">
            <b>{user.name}</b>
          </div>
        )}
      </Link>
    </nav>
  );
}
