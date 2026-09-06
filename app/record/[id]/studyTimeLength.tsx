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

  // フォームに送る値は <select> ではなく、この hidden input だけが持つ。
  //
  // <select> に name を付けると、「完了」を押して編集UIを閉じた瞬間に
  // <select> が DOM から消え、FormData に hours/minutes が入らなくなる
  // (= 入力した学習時間が黙って捨てられる)。
  // hidden input を状態と対応させておけば、開いていても閉じていても必ず送られる。
  //
  // 一度も入力していないときは hidden input 自体を出さない。
  // そうすることでサーバー側が「未入力(null)」と「0時間0分」を区別できる。
  const hiddenFields = hasValue ? (
    <>
      <input type="hidden" name="hours" value={hours} />
      <input type="hidden" name="minutes" value={minutes} />
    </>
  ) : null;

  if (!isEditing) {
    return (
      <>
        {hiddenFields}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2"
        >
          <History className="size-5 shrink-0 text-zinc-500" />
          <span className="flex-1 text-center">
            {hasValue ? `${hours}時間${minutes}分` : "学習時間を追加"}
          </span>
        </button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hiddenFields}
      <History className="size-5 shrink-0 text-zinc-500" />
      <div className="flex flex-1 items-center justify-evenly gap-2">
        <select
          aria-label="時間"
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
          aria-label="分"
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
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="shrink-0 text-sm text-zinc-500"
      >
        完了
      </button>
    </div>
  );
}
