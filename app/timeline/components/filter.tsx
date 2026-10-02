"use client";
import { createClient } from "@/lib/supabase/client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function Filter() {
  const [tags, setTags] = useState<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    async function loadTags() {
      const supabase = createClient();
      const { data, error } = await supabase.from("tags").select("id, name");

      if (error) {
        console.error(error);
        return;
      }

      setTags(data);
    }

    void loadTags();
  }, []);

  const [isOpen, setIsOpen] = useState(false);

  const [TypeIsOpen, setTypeIsOpen] = useState(false);

  const [postType, setPostType] = useState<string[] | null>([
    "knowledge",
    "ask",
    "record",
  ]);

  function togglePostType(type: string) {
    if (postType?.includes(type)) {
      setPostType(postType.filter((t) => t !== type));
    } else {
      setPostType(postType ? [...postType, type] : [type]);
    }
  }

  const [tagsIsOpen, setTagsIsOpen] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  function toggleTags(tag: { id: string; name: string }) {
    if (selectedTagIds.includes(tag.id)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
    } else {
      setSelectedTagIds([...selectedTagIds, tag.id]);
    }
  }

  if (!isOpen)
    return (
      <button onClick={() => setIsOpen(true)}>
        <Search />
      </button>
    );
  return (
    <div className="fixed top-0 right-0 z-20 bg-white">
      <div className="flex flex-col">
        <button onClick={() => setTypeIsOpen(!TypeIsOpen)}>投稿タイプ</button>
        {TypeIsOpen &&
          ["knowledge", "ask", "record"].map((type) => (
            <button
              key={type}
              onClick={() => togglePostType(type)}
              className={`${postType?.includes(type) ? "font-bold" : "text-gray-700"} rounded-md bg-zinc-100 m-1`}
            >
              {type}
            </button>
          ))}
        <button onClick={() => setTagsIsOpen(!tagsIsOpen)}>タグ</button>
        {tagsIsOpen &&
          tags?.map((tag) => (
            <button
              key={`tag-${tag.id}`}
              onClick={() => toggleTags(tag)}
              className={`${selectedTagIds.includes(tag.id) ? "font-bold" : "text-gray-700"} rounded-md bg-zinc-100 m-1`}
            >
              {tag.name}
            </button>
          ))}
      </div>

      <button onClick={() => setIsOpen(false)}>検索</button>
    </div>
  );
}
