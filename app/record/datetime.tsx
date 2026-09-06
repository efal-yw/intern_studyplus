"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

function formatDateTime(now: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export default function DateTimeInput() {
  const [dateTime, setDateTime] = useState(() => formatDateTime(new Date()));

  return (
    <div className="flex items-center gap-4">
      <label htmlFor="date" aria-label="日時" className="shrink-0">
        <Calendar className="size-5 text-zinc-500" />
      </label>
      <div className="flex flex-1 items-center justify-evenly gap-4">
        <input
          type="date"
          id="date"
          name="date"
          value={dateTime.date}
          onChange={(e) =>
            setDateTime((prev) => ({ ...prev, date: e.target.value }))
          }
        />
        <input
          type="time"
          id="time"
          name="time"
          value={dateTime.time}
          onChange={(e) =>
            setDateTime((prev) => ({ ...prev, time: e.target.value }))
          }
        />
      </div>
      <button
        type="button"
        onClick={() => setDateTime(formatDateTime(new Date()))}
        className="shrink-0 text-sm text-blue-500"
      >
        現在時刻
      </button>
    </div>
  );
}