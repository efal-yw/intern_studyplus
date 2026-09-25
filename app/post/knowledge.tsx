import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "@/app/timeline/components/postTime";
import Like from "@/app/timeline/components/like";
import CommentCount from "@/app/timeline/components/commentCount";
import Comments from "@/app/timeline/components/comment";
import type { TimelineComment } from "@/app/timeline/components/getComments";
import Avatar from "@/app/_components/Avatar";
import { signPostImage } from "@/lib/post-image";
import { getCurrentUser } from "@/lib/auth/current-user";
import PostImage from "@/app/timeline/components/postImage";
import DeletePost from "@/app/timeline/components/deletePost";
import Link from "next/link";
import type { TimelineTag } from "@/app/timeline/components/getTags";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function KnowledgePost({
  post_info,
  likeCount,
  liked,
  comments,
  tags,
}: {
  post_info: Post;
  likeCount: number;
  liked: boolean;
  comments: TimelineComment[];
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
    <div className="relative flex">
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
          <p>{author?.name}</p>
          <PostTime createdAt={record.created_at} />
        </Link>
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
        <div className="flex items-center gap-4">
          <Like postId={post_info.post_id} count={likeCount} liked={liked} />
          {/* 一覧と違いコメントは既に取得済みなので、その件数をそのまま出す。 */}
          <CommentCount count={comments.length} />
        </div>
        <Comments postId={post_info.post_id} comments={comments} />
      </div>
    </div>
  );
}
