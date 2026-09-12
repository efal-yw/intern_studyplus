import { getPosts } from "./timeline/components/getPosts";
import RecordPost from "./timeline/components/record";
import KnowledgePost from "./timeline/components/knowledge";
import AskPost from "./timeline/components/ask";
import VisibilityFilter from "./timeline/components/visibility";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/post-form";

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
    const posts = await getPosts(undefined, visibility);

    return (
        <>
        <VisibilityFilter visibility={visibility} />
        <div className="flex flex-col gap-4">
            {posts.map((post) => {
                if (post.type === "record") {
                    return <RecordPost key={post.post_id} post_info={post} />;
                }

                if (post.type === "knowledge") {
                    return <KnowledgePost key={post.post_id} post_info={post} />;
                }

                if (post.type === "ask") {
                    return <AskPost key={post.post_id} post_info={post} />;
                }

                return null;
            })}
        </div>
        </>
    );
}
