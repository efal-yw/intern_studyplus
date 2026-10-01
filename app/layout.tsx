import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Sidebar from "./_components/Sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "オモシロインターン",
  description:
    "インターンをする、もしくはしようと思っている学生のためのコミュニティアプリ。学生のためゆえ面白いことでなくてはならない。面白いインターン、面白インターンということである。",
};

// サイドバーのアバターは全ページ共通なので、ここでまとめて取得して渡す。
// Sidebar が "use client" なのは usePathname のためだけで、データ取得は不要。
async function getSidebarData() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    return { avatarPath: null, user: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar_path")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    console.error("sidebar user fetch failed:", error);
  }

  return {
    avatarPath: data?.avatar_path ?? null,
    user: data
      ? { id: data.id, name: data.name }
      : { id: authUser.id, name: "" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { avatarPath, user } = await getSidebarData();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full">
        <Sidebar avatarPath={avatarPath} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
