import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import PostTime from "@/app/timeline/components/postTime";
import Like from "@/app/timeline/components/like";
import CommentCount from "@/app/timeline/components/commentCount";
import Comments from "@/app/timeline/components/comment";
import type { TimelineComment } from "@/app/timeline/components/getComments";
import type { TimelineTag } from "@/app/timeline/components/getTags";
import Avatar from "@/app/_components/Avatar";
import { signPostImage } from "@/lib/post-image";
import { getCurrentUser } from "@/lib/auth/current-user";
import PostImage from "@/app/timeline/components/postImage";
import DeletePost from "@/app/timeline/components/deletePost";
import Link from "next/link";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default async function RecordPost({
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
  // 0件は異常ではないので single() にしない。
  // 教材は on delete set null で参照が切れることがあり (その場合は
  // record.textbook 自体が null)、RLS 側でも取れない可能性が残る。
  // single() は0件を PGRST116 のエラーにするため、通常の表示で
  // console にエラーが出続けることになる。
  const { data: textbook, error: textbookError } = record.textbook
    ? await supabase
        .from("textbook")
        .select("name")
        .eq("id", record.textbook)
        .maybeSingle()
    : { data: null, error: null };

  if (textbookError) {
    console.error("textbook fetch failed:", textbookError);
  }

  // post_record が無い投稿 (孤児レコード) と、教材が削除された記録を分ける。
  // 前者は教材欄そのものを出さない。後者は時間とメモが残っているので、
  // 何の記録か分からなくならないよう「削除された教材」と明示する。
  const textbookLabel = postRecord
    ? (textbook?.name ?? "削除された教材")
    : null;

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
        <div className="flex flex-col rounded-md bg-zinc-100 p-1 m-1">
          {textbookLabel && <div className="font-bold">{textbookLabel}</div>}
          {record.hours != null && record.minutes != null ? (
            <p>
              <b>{record.hours}</b>時間<b>{record.minutes}</b>分
            </p>
          ) : null}
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
