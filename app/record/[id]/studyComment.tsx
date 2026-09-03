"use client";

import { useState } from "react";
import { AlignLeft } from "lucide-react";

export default function StudyComment() {
  const [studyComment, setStudyComment] = useState("");

  return (
    <div className="flex items-start gap-2">
      <label htmlFor="studyComment" aria-label="コメント">
        <AlignLeft className="size-5 text-zinc-500" />
      </label>
      <textarea
        id="studyComment"
        name="studyComment"
        placeholder="コメント"
        value={studyComment}
        onChange={(e) => setStudyComment(e.target.value)}
      />
    </div>
  );
}
