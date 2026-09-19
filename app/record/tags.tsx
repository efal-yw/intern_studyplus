"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import type { Tables } from "@/lib/database.types";

// 実スキーマから引く。id は uuid なので string、name は null を許す
type Tag = Pick<Tables<"tags">, "id" | "name">;

export default function TagsInput({ tagList }: { tagList: Tag[] }) {
  const [tags, setTags] = useState<string[]>([]);

  return (
    <div className="flex items-start gap-2">
      <label htmlFor="tags" aria-label="タグ" className="shrink-0">
        <Tags className="size-5 text-zinc-500" />
      </label>
      {tagList.map((tag) => <button key={tag.id} type="button" 
        className={`${tags.includes(tag.id) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() =>
          setTags((prev) =>
            prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id],
          )
        }>{tag.name}</button>)}
      <input type="hidden" value={tags.join(", ")} readOnly name="tags"/>
    </div>
  );
}
