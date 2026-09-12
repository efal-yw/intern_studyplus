import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "./postTime";
import Like from "./like";
import Comments from "./comment";
import type { TimelineComment } from "./getComments";
import Link from "next/link";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function AskPost({
    post_info,
    likeCount,
    liked,
    comments,
}: {
    post_info: Post;
    likeCount: number;
    liked: boolean;
    comments: TimelineComment[];
}) {
    const supabase = await createClient();

    const { data: author, error: authorError } = await supabase
        .from("users")
        .select("name")
        .eq("id", post_info.user_id)
        .single();

    const { data: postAsk, error: postAskError } = await supabase
        .from("post_ask")
        .select("*")
        .eq("post_id", post_info.post_id)
        .maybeSingle();

    if (authorError) {
        console.error("author fetch failed:", authorError);
    }

    if (postAskError) {
        console.error("post_ask fetch failed:", postAskError);
    }

    const record = { ...post_info, ...postAsk };

    return (
        <div>
            <Link href={`/users/${post_info.user_id}`} className="flex items-center gap-2">
                <p>{author?.name}</p>
                <PostTime createdAt={record.created_at} />
            </Link>
            <div>
                <p>{record.question}</p>
            </div>
            {record.note && <p>{record.note}</p>}
            <Like postId={post_info.post_id} count={likeCount} liked={liked} />
            <Comments postId={post_info.post_id} comments={comments} />
        </div>
    );
};
