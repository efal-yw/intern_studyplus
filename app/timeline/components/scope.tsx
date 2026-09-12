"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Scope } from "./getPosts";

// 表示範囲の選択肢。value は getPosts の Scope と一致する
// (増やすと Scope 側の型エラーで気づける)
const SCOPE_OPTIONS: ReadonlyArray<{ value: Scope; label: string }> = [
    { value: "all", label: "すべて" },
    { value: "following", label: "フォロー中" },
    { value: "mine", label: "自分" },
];

// 選択中の値は URL (?scope=...) が持つ。
// useState を持つと URL とズレるので、値は props で受け取るだけにする。
export default function ScopeFilter({ scope }: { scope?: Scope }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    function handleChange(value: Scope) {
        // 他のクエリ (将来の type やページング) を壊さないよう既存を引き継ぐ
        const params = new URLSearchParams(searchParams.toString());
        params.set("scope", value);
        const query = params.toString();
        startTransition(() => {
            router.push(query ? `/?${query}` : "/");
        });
    }

    return (
        <div className="w-full grid grid-cols-3 place-items-center">{
        SCOPE_OPTIONS.map((option) => (
            <button
                key={option.value}
                onClick={() => handleChange(option.value)}
                disabled={isPending}
                className={option.value === scope ? "font-bold" : "text-gray-700"}
            >
                {option.label}
            </button>
        ))
    }</div>
    );
}
