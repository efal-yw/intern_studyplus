import Image from "next/image";
import { textbookIconUrl } from "@/lib/textbook-icon";

/**
 * 教材のアイコン。iconPath は icons.icon_path (バケット内のパス) をそのまま渡す。
 *
 * textbook_icons は public バケットなので、URL は文字列を組み立てるだけで作れる
 * (通信も認証もしない)。そのためこのコンポーネントは同期関数のままで、
 * Server / Client どちらからでも使える。
 *
 * アイコンが未設定 (textbook.icon が NULL) の場合は null が渡るので何も描かない。
 */
export default function TextbookIcon({
  iconPath,
  size = 64,
  alt = "",
  className = "",
}: {
  /** icons.icon_path。未設定なら null */
  iconPath: string | null;
  size?: number;
  /** 隣に教材名が出ている場合は既定の "" のままにする(読み上げの重複を避ける) */
  alt?: string;
  className?: string;
}) {
  if (!iconPath) {
    return null;
  }

  return (
    <Image
      src={textbookIconUrl(iconPath)}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
