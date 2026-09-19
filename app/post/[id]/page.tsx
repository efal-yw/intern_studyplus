import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { TimelineComment } from "@/app/timeline/components/getComments";
import type { TimelineTag } from "@/app/timeline/components/getTags";
import RecordPost from "@/app/post/record";
import KnowledgePost from "@/app/post/knowledge";
import AskPost from "@/app/post/ask";

async function getPostInfo(postId: string) {
  const supabase = await createClient();
  const [{ data: post_info, error }, user] = await Promise.all([
    supabase.from("posts").select("*").eq("post_id", postId).single(),
    getCurrentUser(),
  ]);

  if (error || !post_info) throw error ?? new Error("Post not found");

  const [
    { data: likes, error: likesError },
    { data: commentRows, error: commentsError },
    { data: tagRows, error: tagsError },
  ] = await Promise.all([
    supabase
      .from("likes")
      .select("post_id, user_id")
      .eq("post_id", post_info.post_id),
    supabase
      .from("comments")
      .select("comment_id, post_id, contents, created_at, user_id, users(name)")
      .eq("post_id", post_info.post_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("post_tags")
      .select("tag_id, post_id, tags(name)")
      .eq("post_id", post_info.post_id),
  ]);

  if (likesError) throw likesError;
  if (commentsError) throw commentsError;
  if (tagsError) throw tagsError;

  const comments: TimelineComment[] = (commentRows ?? []).map((comment) => ({
    comment_id: comment.comment_id,
    contents: comment.contents,
    created_at: comment.created_at,
    authorName: comment.users?.name ?? null,
    isMine: comment.user_id === user?.id,
  }));

  const tags: TimelineTag[] = (tagRows ?? []).flatMap((tag) => {
    if (!tag.tag_id || !tag.tags) return [];
    return [{ id: tag.tag_id, name: tag.tags.name }];
  });

  return {
    post_info,
    likeCount: likes?.length ?? 0,
    liked: likes?.some((like) => like.user_id === user?.id) ?? false,
    comments,
    tags,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostInfo(id);

  if (post.post_info.type === "record") {
    return <RecordPost {...post} />;
  }

  if (post.post_info.type === "knowledge") {
    return <KnowledgePost {...post} />;
  }

  return <AskPost {...post} />;
}
