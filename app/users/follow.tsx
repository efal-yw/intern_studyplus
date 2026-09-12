"use client";

import { useTransition } from "react";

// フォローボタンの見た目と「押されている間の無効化」だけを持つ。
// 実際の切り替え(サーバーアクションの呼び出しと再取得)は onToggle で親に任せる。
// プロフィールページはクライアント側で fetch しているので、サーバーアクションの
// refresh() ではプロフィールの数字が更新されない。親が取り直す必要がある。
export function FollowButton({
    isFollowing,
    onToggle,
}: {
    isFollowing: boolean;
    onToggle: (nextFollowing: boolean) => Promise<void>;
}) {
    const [isPending, startTransition] = useTransition();

    function handleClick() {
        startTransition(async () => {
            await onToggle(!isFollowing);
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            aria-pressed={isFollowing}
            className={`rounded-full border px-4 py-1 text-sm disabled:opacity-50 ${
                isFollowing
                    ? "border-zinc-300 text-zinc-600"
                    : "border-transparent bg-zinc-900 text-white"
            }`}
        >
            {isFollowing ? "フォロー解除" : "フォロー"}
        </button>
    );
}
