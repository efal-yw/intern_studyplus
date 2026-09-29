import imageCompression from "browser-image-compression";
import { IMAGE_MAX_BYTES } from "@/lib/post-form";

/**
 * 画像の圧縮。canvas を使うのでブラウザでのみ動く (Client Component から呼ぶこと)。
 *
 * webp に変換したうえで maxBytes 以下まで縮める。アイコンと投稿画像で
 * 上限だけが違うので、値は呼び出し側から渡す。
 */
export async function compressImage(
  file: File,
  { maxBytes, maxEdge }: { maxBytes: number; maxEdge: number },
): Promise<File> {
  // Web Worker の起動に失敗した場合はライブラリ側がメインスレッドに落とす
  const compressed = await imageCompression(file, {
    maxSizeMB: maxBytes / (1024 * 1024),
    maxWidthOrHeight: maxEdge,
    fileType: "image/webp",
    useWebWorker: true,
  });

  // maxSizeMB はベストエフォート (既定で最大10回) なので、実サイズを確認する
  if (compressed.size > maxBytes) {
    throw new Error(
      `Image is still ${Math.round(compressed.size / 1024)}KB after compression`,
    );
  }

  // 型定義は File を返すと書いてあるが、実際には Blob に name と lastModified を
  // 生やしただけのものが返る経路がある (canvasToFile の OffscreenCanvas / png / bmp)。
  // Supabase の upload() は Blob でも通るので気づきにくいが、
  // DataTransferItemList.add() は本物の File しか受け付けず TypeError になる。
  // 呼び出し側でいちいち気にせずに済むよう、ここで必ず File に作り直す。
  return new File([compressed], toWebpName(file.name), {
    type: compressed.type || "image/webp",
    lastModified: Date.now(),
  });
}

/** 拡張子を .webp に付け替える。compressImage は必ず webp に変換するため */
function toWebpName(originalName: string) {
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base || "image"}.webp`;
}

// maxBytes はサーバー側の検証 (lib/post-form.ts の getImageFile) と同じ値を使う。
// ここだけ緩めると「クライアントは通すがサーバーが弾く」状態になる。

/** アイコン。表示は小さいが、拡大や高DPIを考えて 512px は残す */
export const AVATAR_LIMITS = { maxBytes: IMAGE_MAX_BYTES, maxEdge: 512 };

/** 投稿画像。本文として読ませるので長辺はもう少し大きく取る */
export const POST_IMAGE_LIMITS = { maxBytes: IMAGE_MAX_BYTES, maxEdge: 1280 };

/** 教材アイコン。表示は 64px だが、拡大や高DPIを考えて 512px は残す */
export const TEXTBOOK_ICON_LIMITS = { maxBytes: IMAGE_MAX_BYTES, maxEdge: 512 };
