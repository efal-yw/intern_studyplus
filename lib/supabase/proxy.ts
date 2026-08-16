import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Fluid compute向け: グローバル変数に置かず、リクエストごとに毎回生成する
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // createServerClientとgetClaims()の間に他の処理を挟まないこと。
  // 挟むとユーザーが意図せずログアウトされるバグの原因になりうる。
  await supabase.auth.getClaims();

  // TODO: ログイン画面を作ったら、未認証ユーザーを /login へ
  // リダイレクトする処理をここに追加する。

  return supabaseResponse;
}
