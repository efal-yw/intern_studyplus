import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Database } from "@/lib/database.types";

const PAGE_SIZE = 30;

type PostType = Database["public"]["Enums"]["post_type"];

/** タイムラインの表示範囲。"all" は絞り込みなし */
export type Scope = "all" | "following" | "mine";

// pull方式(最初の1ページ分)で posts を created_at 降順に取得する
// scope を指定すると DB 側の絞り込み(WHERE)に使う
// postType を指定すると、取得した(最大30件の)結果の中から type が一致するものだけを返す
export async function getPosts(postType?: PostType, scope: Scope = "all") {
  const supabase = await createClient();

  let query = supabase.from("posts").select("*");

  if (scope === "following" || scope === "mine") {
    const user = await getCurrentUser();

    // 未ログインなら「フォロー中」「自分」は絞り込みようがないので空で返す
    if (!user) {
      return [];
    }

    if (scope === "following") {
      const { data: follows, error: followsError } = await supabase
        .from("ff")
        .select("to_user_id")
        .eq("from_user_id", user.id);

      if (followsError) {
        console.error("follows fetch failed:", followsError);
        throw new Error(`follows fetch failed: ${followsError.message}`);
      }

      const followingIds = (follows ?? []).map((f) => f.to_user_id);

      // .in() に空配列を渡すと不正なクエリになるので、先に空で返す
      if (followingIds.length === 0) {
        return [];
      }

      query = query.in("user_id", followingIds);
    } else {
      query = query.eq("user_id", user.id);
    }
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
