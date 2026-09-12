import { getPosts } from "./timeline/components/getPosts";
import { getLikes } from "./timeline/components/getLikes";
import { getComments } from "./timeline/components/getComments";
import RecordPost from "./timeline/components/record";
import KnowledgePost from "./timeline/components/knowledge";
import AskPost from "./timeline/components/ask";
import VisibilityFilter from "./timeline/components/visibility";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/post-form";
import { getCurrentUser } from "@/lib/auth/current-user";

// 絞り込み用: 未指定・不正値は public にする。
function parseVisibilityFilter(
    value: string | string[] | undefined
): Visibility {
    return VISIBILITY_OPTIONS.find((o) => o.value === value)?.value ?? "public";
}

export default async function TimelinePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const visibility = parseVisibilityFilter((await searchParams).visibility);
    // 投稿一覧とログインユーザーは互いに独立しているので並列で取る。
    const [user, posts] = await Promise.all([
        getCurrentUser(),
        getPosts(undefined, visibility),
    ]);

    // いいね・コメントは投稿ごとに引かず、それぞれ1クエリにまとめる。
    // 互いに独立したクエリなので並列で投げる。
    const postIds = posts.map((post) => post.post_id);
    const [{ counts, likedByMe }, commentsByPost] = await Promise.all([
        getLikes(postIds, user?.id ?? null),
        getComments(postIds, user?.id ?? null),
    ]);

    return (
        <>
        <VisibilityFilter visibility={visibility} />
        <div className="flex flex-col gap-4">
            {posts.map((post) => {
                const likeCount = counts.get(post.post_id) ?? 0;
                const liked = likedByMe.has(post.post_id);
                const comments = commentsByPost.get(post.post_id) ?? [];

                if (post.type === "record") {
                    return (
                        <RecordPost
                            key={post.post_id}
                            post_info={post}
                            likeCount={likeCount}
                            liked={liked}
                            comments={comments}
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
                            comments={comments}
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
                            comments={comments}
                        />
                    );
                }

                return null;
            })}
        </div>
        </>
    );
}
