"use client";

import { useState } from "react";
import { AlignLeft } from "lucide-react";

export default function Comment() {
  const [comment, setComment] = useState("");

  return (
    <div className="flex items-start gap-2">
      <label htmlFor="comment" aria-label="コメント" className="shrink-0">
        <AlignLeft className="size-5 text-zinc-500" />
      </label>
      <textarea
        id="comment"
        name="comment"
        placeholder="コメント"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className={`flex-1 ${comment ? "text-left" : "text-center"}`}
      />
    </div>
  );
}
