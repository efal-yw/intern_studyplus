"use client";

import { useState } from "react";
import { AlignLeft } from "lucide-react";

export default function Question() {
  const [question, setQuestion] = useState("");

  return (
    <div className="flex items-start gap-2">
      <label htmlFor="question" aria-label="質問" className="shrink-0">
        <AlignLeft className="size-5 text-zinc-500" />
      </label>
      <textarea
        id="question"
        name="question"
        placeholder="質問"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className={`flex-1 ${question ? "text-left" : "text-center"}`}
      />
    </div>
  );
}
