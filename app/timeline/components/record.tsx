import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "./postTime";
import Like from "./like";
import Comments from "./comment";
import type { TimelineComment } from "./getComments";
import Avatar from "@/app/_components/Avatar";
import { signPostImage } from "@/lib/post-image";
import { getCurrentUser } from "@/lib/auth/current-user";
import PostImage from "./postImage";
import DeletePost from "./deletePost";
import Link from "next/link";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function RecordPost({
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
    const viewer = await getCurrentUser();
    const isOwnPost = viewer?.id === post_info.user_id;

    const { data: author, error: authorError } = await supabase
        .from("users")
        .select("name, avatar_path")
        .eq("id", post_info.user_id)
        .single();

    const { data: postRecord, error: postRecordError } = await supabase
        .from("post_record")
        .select("*")
        .eq("post_id", post_info.post_id)
        .maybeSingle();

    if (authorError) {
        console.error("author fetch failed:", authorError);
    }

    if (postRecordError) {
        console.error("post_record fetch failed:", postRecordError);
    }

    const record = { ...post_info, ...postRecord };
    const { data: textbook, error: textbookError } = record.textbook
        ? await supabase
              .from("textbook")
              .select("name")
              .eq("id", record.textbook)
              .single()
        : { data: null, error: null };

    if (textbookError) {
        console.error("textbook fetch failed:", textbookError);
    }

    return (
        <div className="relative">
            {isOwnPost && <DeletePost postId={post_info.post_id} />}
            <Link href={`/users/${post_info.user_id}`} className="flex items-center gap-2">
                <Avatar avatarPath={author?.avatar_path} />
                <p>{author?.name}</p>
                <PostTime createdAt={record.created_at} />
            </Link>
            <div>
                <div>{textbook?.name}</div>
                {record.hours != null && record.minutes != null ? (
                    <p>
                        {record.hours}時間{record.minutes}分
                    </p>
                ) : null}
            </div>
            {record.note && <p>{record.note}</p>}
            <PostImage src={await signPostImage(supabase, post_info.image)} />
            <Like postId={post_info.post_id} count={likeCount} liked={liked} />
            <Comments postId={post_info.post_id} comments={comments} />
        </div>
    );
};