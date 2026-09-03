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
      <div className="flex items-center gap-2">
        <label htmlFor="date" aria-label="日時">
          <Calendar className="size-5 text-zinc-500" />
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={dateTime.date}
          onChange={(e) =>
            setDateTime((prev) => ({ ...prev, date: e.target.value }))
          }
        />
      </div>
      <div className="flex items-center gap-2">
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
    </div>
  );
}