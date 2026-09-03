"use client";

import { useState } from "react";

const OPTIONS = [
  { value: "private", label: "非公開" },
  { value: "followers", label: "フォロワー" },
  { value: "public", label: "全体" },
] as const;

type Visibility = (typeof OPTIONS)[number]["value"];

export default function Visibility() {
  const [visibility, setVisibility] = useState<Visibility>("public");

  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setVisibility(option.value)}
          aria-pressed={visibility === option.value}
          className={
            visibility === option.value
              ? "px-3 py-1 text-sm font-bold text-black"
              : "px-3 py-1 text-sm text-zinc-500"
          }
        >
          {option.label}
        </button>
      ))}
      <input type="hidden" name="visibility" value={visibility} />
    </div>
  );
}
