import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

const PAGE_SIZE = 30;

type PostType = Database["public"]["Enums"]["post_type"];
type Visibility = Database["public"]["Enums"]["visibility_scope"];

// pull方式(最初の1ページ分)で posts を created_at 降順に取得する
// visibility を指定すると DB 側の絞り込み(WHERE)に使う
// postType を指定すると、取得した(最大30件の)結果の中から type が一致するものだけを返す
export async function getPosts(postType?: PostType, visibility?: Visibility) {
  const supabase = await createClient();

  let query = supabase.from("posts").select("*");

  if (visibility) {
    query = query.eq("visibility", visibility);
  }

  const { data: posts, error } = await query
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    console.error("posts fetch failed:", error);
    throw new Error(`posts fetch failed: ${error.message}`);
  }

  // 投稿がまだ無い/30件に満たない場合も null にはならないが、念のため空配列にフォールバック
  const allPosts = posts ?? [];

  if (!postType) {
    return allPosts;
  }

  return allPosts.filter((post) => post.type === postType);
}
