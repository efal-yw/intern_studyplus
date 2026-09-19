import { createClient } from "@/lib/supabase/server";

// タイムラインに並ぶ投稿の「付いているタグ」をまとめて1クエリで取る。
// 投稿ごとに引くと 30件 x 1回 のクエリになるので、行を全部引いて JS 側で束ねる。
// post_tags の RLS(select) は can_view_post(post_id) なので、投稿が見えていれば
// その投稿のタグも取れる。
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
    // tags(name) は post_tags.tag_id が nullable な外部キーなので
    // 「結合相手なし = null」がありうる。tag_id を見ただけでは型が絞れない
    // (別プロパティなので TS は連動を知らない) ため、使う側を直接弾く。
    // 実際に null で来るのは、タグが消された行と、tags の select が
    // RLS で0件になる未ログイン閲覧のとき。
    if (!tag.tag_id || !tag.post_id || !tag.tags) continue;
    const list = counts.get(tag.post_id) ?? [];
    list.push({ id: tag.tag_id, name: tag.tags.name});
    counts.set(tag.post_id, list)
  }

  return counts;
}
