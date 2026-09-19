import { createClient } from "@/lib/supabase/server";

// タイムラインに並ぶ投稿の「いいね数」と「自分が押したか」をまとめて1クエリで取る。
// 投稿ごとに数えると 30件 x 2回 のクエリになるので、行を全部引いて JS 側で集計する。
// likes の RLS(select) は can_view_post(post_id) なので、投稿が見えていれば
// その投稿のいいねは他人の分も数えられる。
// currentUserId は呼び出し側(page)から受け取る。ここで getCurrentUser() を呼ぶと
// getComments と合わせて auth への往復が2回になるため。
export type TimelineTag = { id: string, name: string };

export async function getTags(postIds: string[]) {
  const counts = new Map<string, TimelineTag[]>();

  if (postIds.length === 0) {
    return counts;
  }

  const supabase = await createClient();

  const { data: tags, error } = await supabase
    .from("post_tags")
    .select("tag_id, post_id, tags(name)")
    .in("post_id", postIds);

  if (error) {
    // タグが取れなくてもタイムライン自体は出したいので、throw せず0件扱いにする。
    console.error("tags fetch failed:", error.message);
    return counts;
  }

  for (const tag of tags ?? []) {
    if (!tag.tag_id || !tag.post_id) continue;
    const list = counts.get(tag.post_id) ?? [];
    list.push({ id: tag.tag_id, name: tag.tags.name});
    counts.set(tag.post_id, list)
  }

  return counts;
}

