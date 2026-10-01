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

export default async function KnowledgePost({
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
    <div className="relative flex p-1">
      {isOwnPost && <DeletePost postId={post_info.post_id} />}
      <Link
        href={`/users/${post_info.user_id}`}
        className="flex items-start m-1"
      >
        <Avatar avatarPath={author?.avatar_path} />
      </Link>
      <div className="flex flex-col">
        <Link
          href={`/users/${post_info.user_id}`}
          className="flex items-center gap-4"
        >
          <p className=" font-bold">{author?.name}</p>
          <PostTime createdAt={record.created_at} />
        </Link>
        <Link href={`/post/${post_info.post_id}`}>
          <div className="m-1">
            <p>{record.contents}</p>
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
