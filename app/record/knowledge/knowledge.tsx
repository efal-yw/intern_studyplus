"use client";

import { useState } from "react";
import { AlignLeft } from "lucide-react";

export default function Knowledge() {
  const [knowledge, setKnowledge] = useState("");

  return (
    <div className="flex items-start gap-2">
      <label htmlFor="knowledge" aria-label="ナレッジ" className="shrink-0">
        <AlignLeft className="size-5 text-zinc-500" />
      </label>
      <textarea
        id="knowledge"
        name="knowledge"
        placeholder="ナレッジ"
        value={knowledge}
        onChange={(e) => setKnowledge(e.target.value)}
        className={`flex-1 ${knowledge ? "text-left" : "text-center"}`}
      />
    </div>
  );
}
