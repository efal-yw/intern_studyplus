"use client";
import { Search } from "lucide-react";
import { useState } from "react";

export default function Filter({ type }: { type?: string[] | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [postType, setPostType] = useState<string[] | null>(type ?? null);

  function togglePostType(type: string) {
    if (postType?.includes(type)) {
      setPostType(postType.filter((t) => t !== type));
    } else {
      setPostType(postType ? [...postType, type] : [type]);
    }
  }

  if (!isOpen)
    return (
      <button onClick={() => setIsOpen(true)}>
        <Search />
      </button>
    );
  return (
    <div>
      {["knowledge", "ask", "record"].map((type) => (
        <button
          key={type}
          onClick={() => togglePostType(type)}
          className={`${postType?.includes(type) ? "font-bold" : "text-gray-700"} rounded-md bg-zinc-100 m-1`}
        >
          {type}
        </button>
      ))}
      <button onClick={() => setIsOpen(false)}>検索</button>
    </div>
  );
}
