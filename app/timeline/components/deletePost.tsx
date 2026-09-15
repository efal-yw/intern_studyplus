"use client";

import { X } from "lucide-react";
import ConfirmButton from "@/app/_components/ConfirmButton";
import { deletePost } from "./deleteActions";

/** 投稿の右上に出す削除ボタン。確認は ConfirmButton 側のダイアログ */
export default function DeletePost({ postId }: { postId: string }) {
  return (
    <ConfirmButton
      onConfirm={() => deletePost(postId)}
      triggerLabel="投稿を削除"
      triggerClassName="absolute right-0 top-0 p-1 text-zinc-400 hover:text-zinc-700"
      message="この投稿を削除しますか？"
      description="画像・いいね・コメントも一緒に削除されます。元に戻せません。"
    >
      <X className="size-4" />
    </ConfirmButton>
  );
}
