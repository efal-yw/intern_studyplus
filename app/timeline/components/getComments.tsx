import { createClient } from "@/lib/supabase/server";

// コメント本文を実際に表示するのは投稿詳細ページ (app/post/[id]) とその配下の
// comment.tsx なので、この型はそちらから参照される。
export type TimelineComment = {
  comment_id: string;
  contents: string;
  created_at: string;
  authorName: string | null;
  // 自分のコメントか。削除ボタンを出すかどうかの判定に使う。
  isMine: boolean;
};

// タイムラインに並ぶ投稿のコメント数を、まとめて1クエリで取る (getLikes と同じ考え方)。
// 一覧では本文を出さない(タップして詳細ページで出す)ので、本文と投稿者名は引かない。
// 投稿ごとに count を投げると30回のクエリになるため、post_id だけ全件引いて JS 側で数える。
// comments の RLS(select) は likes と同じ can_view_post(post_id) なので、
// ここで数えられるのは「その投稿が見えている場合の、その投稿のコメント全件」になる。
export async function getCommentCounts(postIds: string[]) {
  const counts = new Map<string, number>();

  if (postIds.length === 0) {
    return counts;
  }

  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

  if (error) {
    // コメントが取れなくてもタイムライン自体は出したいので、throw せず0件扱いにする。
    console.error("comments fetch failed:", error.message);
    return counts;
  }

  for (const comment of comments ?? []) {
    counts.set(comment.post_id, (counts.get(comment.post_id) ?? 0) + 1);
  }

  return counts;
}
