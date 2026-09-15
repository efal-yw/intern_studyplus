import type { NextConfig } from "next";

/**
 * セキュリティヘッダ。
 *
 * CSP はここに入れていない。postTime.tsx がインラインスクリプトを
 * dangerouslySetInnerHTML で差し込んでおり、CSP を足すと
 * script-src に 'unsafe-inline' が必要になって効果がほぼ無くなるため。
 * あれを片付けてから改めて入れる (リファクタリング棚卸し 第2版 B-9)。
 *
 * Strict-Transport-Security は Vercel が付けるのでここでは指定しない。
 */
const securityHeaders = [
  // iframe への埋め込みを禁止する (クリックジャッキング)。
  // CSP を入れたら frame-ancestors 'none' に置き換わる。
  { key: "X-Frame-Options", value: "DENY" },

  // Content-Type を無視した推測実行をさせない。
  // Storage に置かれたファイルの Content-Type 詐称と組み合わさると効く。
  { key: "X-Content-Type-Options", value: "nosniff" },

  // 外部サイトへの遷移時に、パスやクエリを送らない。
  // 確認メールのトークン付きURLから遷移する経路があるので効く。
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // 使っていないブラウザ機能を明示的に切る。
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(
        "https://vssumrutrexcmlyvigqg.supabase.co/storage/v1/object/public/**"
      ),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
