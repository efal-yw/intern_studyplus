"use client";

import { useState } from "react";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/post-form";

export default function VisibilityInput() {
  const [visibility, setVisibility] = useState<Visibility>("public");

  return (
    <div className="flex items-center justify-evenly gap-1">
      {VISIBILITY_OPTIONS.map((option) => (
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
