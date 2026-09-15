import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico
     *
     * 以前はここに「拡張子が .svg / .png / .jpg / .jpeg / .gif / .webp で終わるパス」
     * も入っていた。これは静的ファイルを避けるつもりの行だったが、実際には
     * 【パスの末尾で判定している】ので、/users/<id> のような動的ルートに
     * "abc.png" を渡すだけでログインゲートを素通りできる状態になっていた。
     *
     * 静的ファイルは _next/static と public/ 配下から配信され、前者は既に
     * 除外済み。public/ に置いたファイルをログインなしで開かせたくなったら、
     * そのパスを名指しでここに足すこと (拡張子で広く開けない)。
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
