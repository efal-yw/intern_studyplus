import { MessageCircle } from "lucide-react";
import Link from "next/link";

// コメント数の表示。いいね (like.tsx) と並べて使う。
// いいねと違ってその場でトグルする操作がないので、クライアント側の状態は持たない。
// postId を渡すとコメントを読める投稿詳細ページへのリンクになる (タイムライン用)。
// 詳細ページ自身のようにコメント一覧がすぐ下にある場所では、postId を省いて
// ただの表示にする。
export default function CommentCount({
    postId,
    count,
}: {
    postId?: string;
    count: number;
}) {
    const className = "flex items-center gap-1 text-sm";
    const content = (
        <>
            <MessageCircle className="size-5 text-zinc-400" />
            <span>{count}</span>
        </>
    );

    if (!postId) {
        return (
            <div aria-label={`コメント${count}件`} className={className}>
                {content}
            </div>
        );
    }

    return (
        <Link
            href={`/post/${postId}`}
            aria-label={`コメント${count}件`}
            className={className}
        >
            {content}
        </Link>
    );
}
