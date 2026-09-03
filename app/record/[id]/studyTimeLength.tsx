"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function buildMinuteOptions(step: number) {
  return Array.from({ length: 60 / step }, (_, i) => i * step);
}

export default function StudyTimeLength() {
  const [isEditing, setIsEditing] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [minuteStep, setMinuteStep] = useState(1);

  const minuteOptions = useMemo(
    () => buildMinuteOptions(minuteStep),
    [minuteStep]
  );

  const toggleMinuteStep = () => {
    const nextStep = minuteStep === 1 ? 5 : 1;
    setMinuteStep(nextStep);
    setMinutes((prev) => Math.round(prev / nextStep) * nextStep);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2"
      >
        <History className="size-5 text-zinc-500" />
        <span>{hasValue ? `${hours}時間${minutes}分` : "学習時間を追加"}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <History className="size-5 text-zinc-500" />
      <select
        name="hours"
        value={hours}
        onChange={(e) => {
          setHours(Number(e.target.value));
          setHasValue(true);
        }}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}時間
          </option>
        ))}
      </select>
      <select
        name="minutes"
        value={minutes}
        onChange={(e) => {
          setMinutes(Number(e.target.value));
          setHasValue(true);
        }}
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}分
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={toggleMinuteStep}
        className="text-sm text-zinc-500"
      >
        {minuteStep}分刻み
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="text-sm text-zinc-500"
      >
        完了
      </button>
    </div>
  );
}
