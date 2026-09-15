"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { compressImage, POST_IMAGE_LIMITS } from "@/lib/image";

/**
 * 投稿フォームの画像入力。
 *
 * 見えている input には name を付けず、圧縮が終わってから隠し input の方に
 * 圧縮後のファイルを載せる。こうしておくと、圧縮中に送信されても
 * 「画像なしで投稿される」で済み、未圧縮の原本が送られることがない。
 * (未圧縮のまま送ると Server Action の body 上限 1MB をすぐ超える)
 */
export default function ImageInput({ name = "image" }: { name?: string }) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearHiddenInput() {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = "";
    }
  }

  function replacePreview(url: string | null) {
    setPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return url;
    });
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      clearHiddenInput();
      replacePreview(null);
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, POST_IMAGE_LIMITS);

      // File を input に載せ替える。form の送信に乗るのはこちらだけ
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      if (hiddenInputRef.current) {
        hiddenInputRef.current.files = transfer.files;
      }

      replacePreview(URL.createObjectURL(compressed));
    } catch (compressError) {
      console.error(compressError);
      clearHiddenInput();
      replacePreview(null);
      setError("画像を読み込めませんでした");
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="flex items-center gap-2">
        <span>画像</span>
        <input type="file" accept="image/*" onChange={handleChange} />
      </label>

      {/* 実際に送信されるのはこちら。圧縮に成功したときだけ中身が入る */}
      <input ref={hiddenInputRef} type="file" name={name} hidden />

      {isCompressing && <p>画像を処理中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        // blob: URL は最適化サーバーから取得できないので unoptimized
        <Image
          src={preview}
          alt="添付する画像のプレビュー"
          width={240}
          height={180}
          unoptimized
          className="h-auto w-60 rounded object-contain"
        />
      )}
    </div>
  );
}
