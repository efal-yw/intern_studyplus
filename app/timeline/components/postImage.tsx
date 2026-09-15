import Image from "next/image";

/**
 * 投稿に添付された画像。src には署名URLが入る。
 *
 * unoptimized にしているのは、署名URLが毎回違う (token に有効期限が入るため)
 * ので Next.js の画像最適化キャッシュが必ずミスし、開くたびに再取得・再変換が
 * 走るのを避けるため。投稿時にクライアント側で 300KB 以下の webp まで
 * 縮めてあるので、最適化しなくても得られるものはほとんど無い。
 * この指定のおかげで next.config.ts の remotePatterns に /object/sign/ を
 * 足す必要も無くなっている (unoptimized は最適化サーバーを通らない)。
 */
export default function PostImage({ src }: { src: string | null }) {
  if (!src) {
    return null;
  }

  return (
    <div className="relative aspect-video w-full max-w-md">
      <Image
        src={src}
        alt="投稿の画像"
        fill
        unoptimized
        className="rounded object-contain"
      />
    </div>
  );
}
