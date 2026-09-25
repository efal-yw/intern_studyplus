import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "./postTime";
import Like from "./like";
import CommentCount from "./commentCount";
import Avatar from "@/app/_components/Avatar";
import { signPostImage } from "@/lib/post-image";
import { getCurrentUser } from "@/lib/auth/current-user";
import PostImage from "./postImage";
import DeletePost from "./deletePost";
import Link from "next/link";
import { TimelineTag } from "./getTags";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function AskPost({
  post_info,
  likeCount,
  liked,
  commentCount,
  tags,
}: {
  post_info: Post;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  tags: TimelineTag[];
}) {
  const supabase = await createClient();
  const viewer = await getCurrentUser();
  const isOwnPost = viewer?.id === post_info.user_id;

  const { data: author, error: authorError } = await supabase
    .from("users")
    .select("name, avatar_path")
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
    <div className="relative flex">
      {isOwnPost && <DeletePost postId={post_info.post_id} />}
      <Link
        href={`/users/${post_info.user_id}`}
        className="flex items-start m-1"
      >
        <Avatar avatarPath={author?.avatar_path} />
      </Link>
      <div className="flex-col">
        <Link
          href={`/users/${post_info.user_id}`}
          className="flex items-center gap-4"
        >
          <p>{author?.name}</p>
          <PostTime createdAt={record.created_at} />
        </Link>
        <Link href={`/post/${post_info.post_id}`}>
          <div className="m-1">
            <p>{record.question}</p>
          </div>
          {record.note && <p className="m-1">{record.note}</p>}
          <PostImage src={await signPostImage(supabase, post_info.image)} />
          {tags ? (
            <ul>
              {tags.map((tag) => (
                <li key={tag.id}>{tag.name}</li>
              ))}
            </ul>
          ) : null}
        </Link>
        <div className="flex items-center gap-4">
          <Like postId={post_info.post_id} count={likeCount} liked={liked} />
          <CommentCount postId={post_info.post_id} count={commentCount} />
        </div>
      </div>
    </div>
  );
}
