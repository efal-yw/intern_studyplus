import Image from "next/image";

// textbook.icon_path は "<バケット名>/<バケット内のパス>" の形で持つ
// (例: "images/TextbookIconBlue.png")。バケットをコード側で固定しないので、
// あとからアイコンを別バケットに置いてもこの関数を直さずに済む。
//
// public バケットの公開URLがちょうど同じ並びなので、前に固定部分を足すだけでよい。
// getPublicUrl() と違って通信も認証もしないため、このコンポーネントは
// Server / Client どちらからでも使えて、async にする必要も無い。
// URL の形は next.config.ts の remotePatterns と対。
//
// Storage の API (upload / remove / createSignedUrl) はバケットとパスを別々の
// 引数で受け取るので、そちらを書くときは最初の "/" で分ける。バケット名に "/" は
// 使えないので、1回目の "/" で切れば必ず正しく分かれる。
function iconUrl(iconPath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${iconPath}`;
}

export default function TextbookIcon({
  iconPath,
  size = 64,
  alt = "",
  className = "",
}: {
  /** textbook.icon_path の値 */
  iconPath: string;
  size?: number;
  /** 隣に教材名が出ている場合は既定の "" のままにする(読み上げの重複を避ける) */
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={iconUrl(iconPath)}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
