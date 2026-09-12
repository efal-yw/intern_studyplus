"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

// フォローの ON/OFF を切り替える。
// クライアントから受け取るのは「誰を」「どちらにしたいか」だけ。
// フォローする側(from_user_id)はセッションから引き直す。
// (サーバーアクションは UI を通さない POST でも叩けるので、クライアント由来の id は信用しない)
export async function toggleFollow(targetUserId: string, nextFollowing: boolean) {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  // 自分自身はフォローできない。DB 側にも ff_no_self_follow があるが、
  // 制約違反を出すより手前で止める。
  if (user.id === targetUserId) {
    return;
  }

  const supabase = await createClient();

  if (nextFollowing) {
    const { error } = await supabase
      .from("ff")
      .insert({ from_user_id: user.id, to_user_id: targetUserId });

    // 23505 = unique_violation。連打などで既に行がある場合で、状態としては成功。
    // (DB 側に ff_from_to_unique = UNIQUE (from_user_id, to_user_id) がある)
    if (error && error.code !== "23505") {
      console.error("follow insert failed:", error.message);
      return;
    }
  } else {
    const { error } = await supabase
      .from("ff")
      .delete()
      .eq("from_user_id", user.id)
      .eq("to_user_id", targetUserId);

    if (error) {
      console.error("follow delete failed:", error.message);
      return;
    }
  }

  refresh();
}
