import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://vssumrutrexcmlyvigqg.supabase.co",
  "sb_publishable_PR2S29qhgxkLubxjnDZCYA_imqOq174"
);

const { data: posts, error: postsError } = await supabase
  .from("posts")
  .select("*")
  .in("type", ["knowledge", "ask"]);

console.log("posts (knowledge/ask):", JSON.stringify(posts, null, 2));
console.log("posts error:", JSON.stringify(postsError, Object.getOwnPropertyNames(postsError ?? {}), 2));

if (posts && posts.length > 0) {
  for (const p of posts) {
    const table = p.type === "knowledge" ? "post_knowledge" : "post_ask";
    const { data, error } = await supabase.from(table).select("*").eq("post_id", p.post_id);
    console.log(table, p.post_id, "->", JSON.stringify(data), "err:", JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})));
  }
}
