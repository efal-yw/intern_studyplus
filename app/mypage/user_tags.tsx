"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserTag = { tag_id: string; tags: { name: string } | null };

export default function UserTags({ userId }: { userId: string }) {
  const [tags, setTags] = useState<UserTag[]>([]);

  useEffect(() => {
    async function loadTags() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_tag")
        .select("tag_id, tags(name)")
        .eq("user_id", userId);

      if (error) {
        console.error(error);
        return;
      }

      setTags(data ?? []);
    }

    loadTags();
  }, [userId]);

  return (
    <div className="flex flex-col justify-start gap-2 bg-zinc-200 p-2 rounded-md">
      <h2 className="font-bold gap-2">タグ</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.tag_id}
            className="mx-2 my-1 rounded-md p-1 bg-zinc-100 text-sm"
          >
            {tag.tags?.name}
          </span>
        ))}
        {!tags && (
          <span className="text-sm text-zinc-500">タグは未設定です</span>
        )}
      </div>
    </div>
  );
}
