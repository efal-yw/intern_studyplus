"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getText, countChars, COMMENT_MAX_LENGTH } from "@/lib/post-form";

const TOO_LONG = `コメントは${COMMENT_MAX_LENGTH}文字までです。`;

// コメントを投稿する。likes と同じく、クライアントから受け取るのは
// 「どの投稿に」「何を」だけで、user_id はセッションから引き直す。
// 戻り値はエラーメッセージ(成功なら null)。useActionState 側で拾って表示する。
export async function addComment(
  postId: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const contents = getText(formData.get("contents") ?? undefined);

  // 空白だけの送信は何もせず戻す(エラー扱いにはしない)。
  if (!contents) {
    return null;
  }

  if (countChars(contents) > COMMENT_MAX_LENGTH) {
    return TOO_LONG;
  }

  const user = await getCurrentUser();

  if (!user) {
    return "コメントするにはログインが必要です。";
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: user.id, contents });

  if (error) {
    console.error("comment insert failed:", error.message);
    return "コメントを送信できませんでした。";
  }

  refresh();
  return null;
}

// 自分のコメントを編集する。
// 更新できるのは本文だけで、post_id / user_id は触らない。
export async function updateComment(
  commentId: string,
  rawContents: string
): Promise<string | null> {
  const contents = getText(rawContents);

  if (!contents) {
    return "コメントを入力してください。";
  }

  if (countChars(contents) > COMMENT_MAX_LENGTH) {
    return TOO_LONG;
  }

  const user = await getCurrentUser();

  if (!user) {
    return "コメントするにはログインが必要です。";
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .update({ contents })
    .eq("comment_id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("comment update failed:", error.message);
    return "コメントを保存できませんでした。";
  }

  refresh();
  return null;
}

// 自分のコメントを削除する。
// RLS(comments_delete_self)でも守られているが、ここでも user_id を条件に入れて
// 「他人のコメントには触れない」ことをコード上でも明示する。
export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("comment delete failed:", error.message);
    return;
  }

  refresh();
}
