"use client";

import { useRef, useTransition, type ReactNode } from "react";

/**
 * 押すと確認ダイアログを出し、承認されたら onConfirm を実行するボタン。
 *
 * ネイティブの <dialog> を showModal() で使っている。背面を操作させない、
 * Esc で閉じる、フォーカストラップ、といった挙動を自前で書かずに済むため。
 * window.confirm と違って見た目を揃えられ、処理中の表示も出せる。
 */
export default function ConfirmButton({
  onConfirm,
  triggerLabel,
  triggerClassName,
  children,
  message,
  description,
  confirmLabel = "削除する",
  pendingLabel = "削除中...",
}: {
  onConfirm: () => void | Promise<void>;
  /** アイコンだけのボタンになるので aria-label は必須 */
  triggerLabel: string;
  triggerClassName?: string;
  /** ボタンの中身 (アイコンなど) */
  children: ReactNode;
  message: string;
  description?: string;
  confirmLabel?: string;
  pendingLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto rounded p-6 backdrop:bg-black/40"
        // 実行中に Esc で閉じられると、結果が分からないまま画面だけ戻る
        onCancel={(event) => {
          if (isPending) {
            event.preventDefault();
          }
        }}
      >
        <div className="flex flex-col gap-4">
          <p>{message}</p>
          {description && (
            <p className="text-sm text-zinc-500">{description}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="text-red-600"
            >
              {isPending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
