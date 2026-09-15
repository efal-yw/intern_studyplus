import Image from "next/image";

const AVATAR_BUCKET = "avatars";

// Supabase クライアントを受け取らずに URL を組み立てている。
// getPublicUrl() は通信も認証もせず文字列を作るだけなので、クライアントを
// 持たない分このコンポーネントは Server / Client どちらからでも使えて、
// async にする必要も無い。パスの形は next.config.ts の remotePatterns と対。
function avatarUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

export default function Avatar({
  avatarPath,
  size = 32,
  alt = "",
  className = "",
}: {
  /** users.avatar_path の値。null なら既定アイコンを出す */
  avatarPath: string | null | undefined;
  size?: number;
  /** 隣に名前が出ている場合は既定の "" のままにする(読み上げの重複を避ける) */
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={avatarPath ? avatarUrl(avatarPath) : "/favicon.ico"}
      alt={alt}
      width={size}
      height={size}
      className={`aspect-square rounded-full object-cover ${className}`}
    />
  );
}
