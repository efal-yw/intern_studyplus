"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "./likeActions";

export default function Like({
    postId,
    count,
    liked,
}: {
    postId: string;
    count: number;
    liked: boolean;
}) {
    // サーバーの往復(200ms前後)を待つと「押しても反応しない」ように見えるので、
    // クリックした瞬間の表示は楽観的な値で描く。
    // トランジションが終わって新しい props が来ると、この値は自動で捨てられる。
    const [optimistic, setOptimistic] = useOptimistic({ count, liked });
    const [, startTransition] = useTransition();

    function handleClick() {
        startTransition(async () => {
            // props ではなく optimistic から次の状態を作る。
            // 連打されたとき、古い値を読まずに正しくトグルできる。
            const nextLiked = !optimistic.liked;

            setOptimistic({
                liked: nextLiked,
                count: optimistic.count + (nextLiked ? 1 : -1),
            });

            await toggleLike(postId, nextLiked);
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-pressed={optimistic.liked}
            aria-label={optimistic.liked ? "いいねを取り消す" : "いいねする"}
            className="flex items-center gap-1 text-sm"
        >
            <Heart
                className={`size-5 ${
                    optimistic.liked ? "text-rose-500" : "text-zinc-400"
                }`}
                fill={optimistic.liked ? "currentColor" : "none"}
            />
            <span>{optimistic.count}</span>
        </button>
    );
}
