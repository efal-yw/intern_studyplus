import { createClient } from "@/lib/supabase/server";

export type TimelineComment = {
  comment_id: string;
  contents: string;
  created_at: string;
  authorName: string | null;
  // 自分のコメントか。削除ボタンを出すかどうかの判定に使う。
  isMine: boolean;
};

// タイムラインに並ぶ投稿のコメントを、まとめて1クエリで取る (getLikes と同じ考え方)。
// 投稿者名は users を埋め込んで一緒に引く。
// comments_user_id_fkey があるので PostgREST が結合を解決できる。
// comments の RLS(select) は likes と同じ can_view_post(post_id) なので、
// 投稿が見えていれば他人のコメントも読める。
export async function getComments(
  postIds: string[],
  currentUserId: string | null
) {
  const byPost = new Map<string, TimelineComment[]>();

  if (postIds.length === 0) {
    return byPost;
  }

  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select("comment_id, post_id, contents, created_at, user_id, users(name)")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) {
    // コメントが取れなくてもタイムライン自体は出したいので、throw せず0件扱いにする。
    console.error("comments fetch failed:", error.message);
    return byPost;
  }

  for (const comment of comments ?? []) {
    const list = byPost.get(comment.post_id) ?? [];

    list.push({
      comment_id: comment.comment_id,
      contents: comment.contents,
      created_at: comment.created_at,
      authorName: comment.users?.name ?? null,
      isMine: comment.user_id === currentUserId,
    });

    byPost.set(comment.post_id, list);
  }

  return byPost;
}
