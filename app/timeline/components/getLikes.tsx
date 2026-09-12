import { createClient } from "@/lib/supabase/server";

// タイムラインに並ぶ投稿の「いいね数」と「自分が押したか」をまとめて1クエリで取る。
// 投稿ごとに数えると 30件 x 2回 のクエリになるので、行を全部引いて JS 側で集計する。
// likes の RLS(select) は can_view_post(post_id) なので、投稿が見えていれば
// その投稿のいいねは他人の分も数えられる。
// currentUserId は呼び出し側(page)から受け取る。ここで getCurrentUser() を呼ぶと
// getComments と合わせて auth への往復が2回になるため。
export async function getLikes(postIds: string[], currentUserId: string | null) {
  const counts = new Map<string, number>();
  const likedByMe = new Set<string>();

  if (postIds.length === 0) {
    return { counts, likedByMe };
  }

  const supabase = await createClient();

  const { data: likes, error } = await supabase
    .from("likes")
    .select("post_id, user_id")
    .in("post_id", postIds);

  if (error) {
    // いいねが取れなくてもタイムライン自体は出したいので、throw せず0件扱いにする。
    console.error("likes fetch failed:", error.message);
    return { counts, likedByMe };
  }

  for (const like of likes ?? []) {
    counts.set(like.post_id, (counts.get(like.post_id) ?? 0) + 1);

    if (like.user_id === currentUserId) {
      likedByMe.add(like.post_id);
    }
  }

  return { counts, likedByMe };
}
