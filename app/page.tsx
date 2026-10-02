import { getPosts } from "./timeline/components/getPosts";
import { getLikes } from "./timeline/components/getLikes";
import { getCommentCounts } from "./timeline/components/getComments";
import { getTags } from "./timeline/components/getTags";
import RecordPost from "./timeline/components/record";
import KnowledgePost from "./timeline/components/knowledge";
import AskPost from "./timeline/components/ask";
import ScopeFilter from "./timeline/components/scope";
import type { Scope } from "./timeline/components/getPosts";
import { getCurrentUser } from "@/lib/auth/current-user";
import Filter from "./timeline/components/filter";

const SCOPES: ReadonlyArray<Scope> = ["all", "following", "mine"];

// 絞り込み用: 未指定・不正値は all にする。
function parseScope(value: string | string[] | undefined): Scope {
  return SCOPES.find((s) => s === value) ?? "all";
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const scope = parseScope((await searchParams).scope);
  // 投稿一覧とログインユーザーは互いに独立しているので並列で取る。
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    getPosts(undefined, scope),
  ]);

  // いいね・コメントは投稿ごとに引かず、それぞれ1クエリにまとめる。
  // 互いに独立したクエリなので並列で投げる。
  const postIds = posts.map((post) => post.post_id);
  const [{ counts, likedByMe }, commentCounts, tagsByPost] = await Promise.all([
    getLikes(postIds, user?.id ?? null),
    getCommentCounts(postIds),
    getTags(postIds),
  ]);

  const FilterInfo = {
    type: ["knowledge", "ask", "record"],
  };

  return (
    <>
      <div className="flex">
        <ScopeFilter scope={scope} />
        <Filter type={FilterInfo.type} />
      </div>
      <div className="flex flex-col [&>*]:border-t [&>*]:border-zinc-200">
        {posts.map((post) => {
          const likeCount = counts.get(post.post_id) ?? 0;
          const liked = likedByMe.has(post.post_id);
          const commentCount = commentCounts.get(post.post_id) ?? 0;
          const tags = tagsByPost.get(post.post_id) ?? [];

          if (post.type === "record") {
            return (
              <RecordPost
                key={post.post_id}
                post_info={post}
                likeCount={likeCount}
                liked={liked}
                commentCount={commentCount}
                tags={tags}
              />
            );
          }

          if (post.type === "knowledge") {
            return (
              <KnowledgePost
                key={post.post_id}
                post_info={post}
                likeCount={likeCount}
                liked={liked}
                commentCount={commentCount}
                tags={tags}
              />
            );
          }

          if (post.type === "ask") {
            return (
              <AskPost
                key={post.post_id}
                post_info={post}
                likeCount={likeCount}
                liked={liked}
                commentCount={commentCount}
                tags={tags}
              />
            );
          }

          return null;
        })}
      </div>
    </>
  );
}
