import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * 確認後の遷移先を、自サイト内のパスだけに限定する。
 *
 * next はURLのクエリ文字列なので誰でも好きな値を書ける。検証せずに redirect()
 * に渡すと、正規ドメインのリンクを踏ませて外部サイトに着地させられる
 * (メール確認は実際に成功するので、踏んだ側に疑う材料がない)。
 *
 * "//" を別に弾いているのは、"//evil.example" がスキーム相対URLだから。
 * "/" で始まるのでサイト内パスに見えるが、ブラウザは外部サイトとして解釈する。
 * startsWith("/") だけのチェックはこれで抜けられる。
 */
function safeNext(value: string | null): string {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login");
}
