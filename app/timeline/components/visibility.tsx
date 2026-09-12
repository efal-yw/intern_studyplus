"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/post-form";

// 選択中の値は URL (?visibility=...) が持つ。
// useState を持つと URL とズレるので、値は props で受け取るだけにする。
export default function VisibilityFilter({
    visibility,
}: {
    visibility?: Visibility;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    function handleChange(value: string) {
        // 他のクエリ (将来の type やページング) を壊さないよう既存を引き継ぐ
        const params = new URLSearchParams(searchParams.toString());
        params.set("visibility", value);
        const query = params.toString();
        startTransition(() => {
            router.push(query ? `/?${query}` : "/");
        });
    }

    return (
        <div className="w-full grid grid-cols-3 place-items-center">{
        VISIBILITY_OPTIONS.map((option) => (
            <button
                key={option.value}
                onClick={() => handleChange(option.value)}
                disabled={isPending}
                className={option.value === visibility ? "font-bold" : "text-gray-700"}
            >
                {option.label}
            </button>
        ))
    }</div>
    );
}

