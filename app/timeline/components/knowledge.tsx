import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "./postTime";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function KnowledgePost({ post_info }: { post_info: Post }) {
    const supabase = await createClient();

    const { data: author, error: authorError } = await supabase
        .from("users")
        .select("name")
        .eq("id", post_info.user_id)
        .single();

    const { data: postKnowledge, error: postKnowledgeError } = await supabase
        .from("post_knowledge")
        .select("*")
        .eq("post_id", post_info.post_id)
        .maybeSingle();

    if (authorError) {
        console.error("author fetch failed:", authorError);
    }

    if (postKnowledgeError) {
        console.error("post_knowledge fetch failed:", postKnowledgeError);
    }

    const record = { ...post_info, ...postKnowledge };

    return (
        <div>
            <div className="flex items-center gap-2">
                <p>{author?.name}</p>
                <PostTime createdAt={record.created_at} />
            </div>
            <div>
                <p>{record.contents}</p>
            </div>
            {record.note && <p>{record.note}</p>}
        </div>
    );
};
