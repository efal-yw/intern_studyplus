"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

// いいねの ON/OFF を切り替える。
// クライアントから受け取るのは「どの投稿を」「どちらにしたいか」だけ。
// 誰が押したか(user_id)はセッションから引き直す。
// (サーバーアクションは UI を通さない POST でも叩けるので、クライアント由来の id は信用しない)
export async function toggleLike(postId: string, nextLiked: boolean) {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  const supabase = await createClient();

  if (nextLiked) {
    const { error } = await supabase
      .from("likes")
      .insert({ post_id: postId, user_id: user.id });

    // 23505 = unique_violation。連打などで既に行がある場合で、状態としては成功。
    // TODO: likes に (post_id, user_id) の unique 制約が無いとこの分岐は効かず、
    //       重複行が入っていいね数が水増しされる。制約の有無を確認すること。
    if (error && error.code !== "23505") {
      console.error("like insert failed:", error.message);
      return;
    }
  } else {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("like delete failed:", error.message);
      return;
    }
  }

  // 失敗時にここへ来ないのは意図的。refresh() を呼ばなければ現在のルートが再描画されず、
  // クライアント側の楽観的な表示がサーバーの値(= 変更前)に戻る。
  refresh();
}
