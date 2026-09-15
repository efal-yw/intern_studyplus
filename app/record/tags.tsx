"use client";

import { useState } from "react";
import { Tags } from "lucide-react";

export default function TagsInput({tagList}) {
  const [tags, setTags] = useState([]);

  return (
    <div className="flex items-start gap-2">
      <label htmlFor="tags" aria-label="タグ" className="shrink-0">
        <Tags className="size-5 text-zinc-500" />
      </label>
      {tagList.map((tag) => <button key={tag.id} type="button" 
        className={`${tags.includes(tag.id) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={
            ()=> {tags.includes(tag.id) ? setTags(tags.filter((t) => t !== tag.id)) : setTags([...tags, tag.id])}
            }>{tag.name}</button>)}
      <input type="hidden" value={tags.join(", ")} readOnly name="tags"/>
    </div>
  );
}
