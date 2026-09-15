"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import ConfirmButton from "@/app/_components/ConfirmButton";
import PostTime from "./postTime";
import { addComment, deleteComment, updateComment } from "./commentActions";
import type { TimelineComment } from "./getComments";
import { COMMENT_MAX_LENGTH } from "@/lib/post-form";

// 1件分。編集中かどうかは行ごとの状態なので、ここに閉じ込める。
function CommentRow({
    comment,
    onDelete,
}: {
    comment: TimelineComment;
    onDelete: (commentId: string) => Promise<void>;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(comment.contents);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSave() {
        startTransition(async () => {
            const message = await updateComment(comment.comment_id, draft);

            // 失敗したときは編集モードのままにする。
            // 閉じてしまうと、入力し直した内容がどこにも残らない。
            if (message) {
                setError(message);
                return;
            }

            setError(null);
            setIsEditing(false);
        });
    }

    function handleCancel() {
        setDraft(comment.contents);
        setError(null);
        setIsEditing(false);
    }

    if (isEditing) {
        return (
            <li className="text-sm">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={COMMENT_MAX_LENGTH}
                        className="flex-1"
                    />
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                    >
                        {isPending ? "保存中" : "保存"}
                    </button>
                    <button type="button" onClick={handleCancel}>
                        キャンセル
                    </button>
                </div>
                {error && <p className="text-rose-500">{error}</p>}
            </li>
        );
    }

    return (
        <li className="text-sm">
            <div className="flex items-center gap-2">
                <span className="font-bold">{comment.authorName}</span>
                <PostTime createdAt={comment.created_at} />
                {comment.isMine && (
                    <>
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            aria-label="コメントを編集"
                            className="text-zinc-400"
                        >
                            <Pencil className="size-4" />
                        </button>
                        <ConfirmButton
                            onConfirm={() => onDelete(comment.comment_id)}
                            triggerLabel="コメントを削除"
                            triggerClassName="text-zinc-400"
                            message="このコメントを削除しますか？"
                            description="元に戻せません。"
                        >
                            <X className="size-4" />
                        </ConfirmButton>
                    </>
                )}
            </div>
            <p>{comment.contents}</p>
        </li>
    );
}

export default function Comments({
    postId,
    comments,
}: {
    postId: string;
    comments: TimelineComment[];
}) {
    // postId を先に埋めて、useActionState が期待する (prevState, formData) の形にする。
    const [error, formAction, isPending] = useActionState(
        addComment.bind(null, postId),
        null
    );

    // 削除したコメントは、サーバーの再描画を待たずにその場で消す。
    // 削除が失敗すると commentActions 側が refresh() を呼ばないので、元に戻る。
    const [visibleComments, hideComment] = useOptimistic(
        comments,
        (current: TimelineComment[], commentId: string) =>
            current.filter((comment) => comment.comment_id !== commentId)
    );
    // 確認ダイアログは ConfirmButton 側にあり、これはその承認後に呼ばれる。
    // ConfirmButton が startTransition の中で await するので、hideComment を
    // トランジション内で呼ぶという useOptimistic の条件はここで満たされている。
    async function handleDelete(commentId: string) {
        hideComment(commentId);
        await deleteComment(commentId);
    }

    return (
        <div className="flex flex-col gap-2">
            {visibleComments.length > 0 && (
                <ul className="flex flex-col gap-1">
                    {visibleComments.map((comment) => (
                        <CommentRow
                            key={comment.comment_id}
                            comment={comment}
                            onDelete={handleDelete}
                        />
                    ))}
                </ul>
            )}

            {/* action を渡した form は、送信が成功すると非制御の入力を React が空に戻す */}
            <form action={formAction} className="flex items-center gap-2">
                <input
                    type="text"
                    name="contents"
                    placeholder="コメントする"
                    required
                    maxLength={COMMENT_MAX_LENGTH}
                    className="flex-1 text-sm"
                />
                <button type="submit" disabled={isPending} className="text-sm">
                    {isPending ? "送信中" : "送信"}
                </button>
            </form>

            {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
    );
}
