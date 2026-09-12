"use client";

import { useId } from "react";

const WITH_YEAR: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
};
const WITH_DATE: Intl.DateTimeFormatOptions = {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
};
const TIME_ONLY: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
};

function pickFormat(posted: Date, now: Date): Intl.DateTimeFormatOptions {
    if (posted.getFullYear() !== now.getFullYear()) return WITH_YEAR;
    if (posted.toDateString() !== now.toDateString()) return WITH_DATE;
    return TIME_ONLY;
}

export default function PostTime({ createdAt }: { createdAt: string }) {
    const id = useId();
    const posted = new Date(createdAt);

    // ハードナビゲーション時、最初の描画前にブラウザのロケール/タイムゾーンと現在時刻で上書きする。
    // 分岐条件は pickFormat と同じものを保つこと（スクリプトはReactのバンドル読み込み前に走るため関数を参照できない）。
    const script = `{var d=new Date(${JSON.stringify(createdAt)}),n=new Date(),e=document.getElementById(${JSON.stringify(id)});if(e)e.textContent=d.toLocaleString(undefined,d.getFullYear()!==n.getFullYear()?${JSON.stringify(WITH_YEAR)}:d.toDateString()!==n.toDateString()?${JSON.stringify(WITH_DATE)}:${JSON.stringify(TIME_ONLY)})}`;

    return (
        <>
            <time id={id} dateTime={createdAt} suppressHydrationWarning>
                {posted.toLocaleString(undefined, pickFormat(posted, new Date()))}
            </time>
            <script
                type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
                suppressHydrationWarning
                dangerouslySetInnerHTML={{ __html: script }}
            />
        </>
    );
}
