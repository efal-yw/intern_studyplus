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
    <div className="flex gap-2">
      {tags.map((tag) => (
        <span key={tag.tag_id}>{tag.tags?.name}</span>
      ))}
    </div>
  );
}
