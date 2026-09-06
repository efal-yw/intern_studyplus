import { getPosts } from "./timeline/components/getPosts";
import RecordPost from "./timeline/components/record";
import KnowledgePost from "./timeline/components/knowledge";
import AskPost from "./timeline/components/ask";

export default async function TimelinePage() {
    const posts = await getPosts();

    return (
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
    );
}