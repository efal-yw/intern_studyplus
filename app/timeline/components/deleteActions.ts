"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { removePostImage } from "@/lib/post-image";

/**
 * 投稿を削除する。
 *
 * 子テーブル (post_record / post_ask / post_knowledge / likes / comments) は
 * FK の on delete cascade で一緒に消えるので、消すのは posts の1行だけでよい。
 *
 * 権限の本体は RLS の posts_delete_own。ここでの所有者チェックは
 * 早期リターンのためのもので、これが無くても他人の投稿は消えない。
 */
export async function deletePost(postId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const supabase = await createClient();

  // 画像のパスは行が消えると読めなくなるので、先に控えておく。
  // ここで取れない = 既に消えている or 見る権限が無い。どちらも「何もしない」が正解。
  // (二重送信や戻るボタンでエラーを出さないよう、べき等に倒している)
  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("user_id, image")
    .eq("post_id", postId)
    .maybeSingle();

  if (fetchError) {
    console.error("post fetch before delete failed:", fetchError.message);
    return;
  }

  if (!post || post.user_id !== user.id) {
    return;
  }

  // DB を先に消し、Storage は後。逆順にすると、DB 削除が失敗したときに
  // 「画像だけ消えた投稿」がタイムラインに残る。この順なら最悪でも
  // 孤児ファイルが残るだけで、ユーザーには見えない壊れ方で済む。
  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("post_id", postId);

  if (error) {
    console.error("post delete failed:", error.message);
    return;
  }

  // RLS に弾かれた場合、error は出ずに count が 0 になる。
  // 実際に行が消えたときだけ画像を消す (消えていないのに画像だけ消すと壊れる)
  if (count && post.image) {
    await removePostImage(supabase, post.image);
  }

  // 呼ばないとタイムラインのキャッシュに消したはずの投稿が残る
  refresh();
}
