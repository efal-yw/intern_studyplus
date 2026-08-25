export type Visibility = "public" | "followers" | "private";
 
export type InternshipStatus =
  | "considering" // 検討中
  | "applying"    // 選考中
  | "active"      // 参加中
  | "finished";   // 終了
 
export const STATUS_DOT_CLASS: Record<InternshipStatus, string> = {
  considering: "bg-zinc-400",
  applying: "bg-amber-500",
  active: "bg-emerald-600",
  finished: "bg-zinc-300",
};
 
export const STATUS_LABEL: Record<InternshipStatus, string> = {
  considering: "検討中",
  applying: "選考中",
  active: "参加中",
  finished: "終了",
};
 
export type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  status_message: string | null; 
  following_count: number | null;
  follower_count: number | null;
  internship_status: InternshipStatus | null;
  internship_started_on: string | null; // YYYY-MM-DD
  record_count: number | null;
  prefecture: string | null;
  grade: { label: string } | null;
  high_school: string | null;
  university: { name: string; faculty: string | null } | null;
  tags: string[] | null;
};
 
 
export type Stat = {
  key: string;
  label: string;
  unit?: string;
  value: (p: Profile, today: string) => number | null;
};
 
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.floor((b - a) / 86_400_000) + 1; 
}
 
export const PRIMARY_STATS: Stat[] = [
  {
    key: "days",
    label: "継続日数",
    unit: "日",
    value: (p, today) =>
      p.internship_started_on ? daysBetween(p.internship_started_on, today) : null,
  },
  {
    key: "records",
    label: "記録",
    unit: "件",
    value: (p) => p.record_count ?? 0,
  },
];
 
 
export type FieldKey =
  | "started_on"
  | "prefecture"
  | "grade"
  | "high_school"
  | "university";
 
type FieldDef = {
  key: FieldKey;
  label: string;
  value: (p: Profile) => string | null;
};
 
const FIELDS: Record<FieldKey, FieldDef> = {
  started_on: {
    key: "started_on",
    label: "開始日",
    value: (p) => {
      if (!p.internship_started_on) return null;
      const [y, m, d] = p.internship_started_on.split("-");
      return `${y}年${Number(m)}月${Number(d)}日`;
    },
  },
  prefecture: { key: "prefecture", label: "都道府県", value: (p) => p.prefecture },
  grade: { key: "grade", label: "学年・職業", value: (p) => p.grade?.label ?? null },
  high_school: { key: "high_school", label: "高校", value: (p) => p.high_school },
  university: {
    key: "university",
    label: "大学",
    value: (p) =>
      p.university
        ? [p.university.name, p.university.faculty].filter(Boolean).join(" ")
        : null,
  },
};
 
export type Section =
  | { kind: "fields"; title: string; fields: FieldKey[] }
  | { kind: "text"; title: string; value: (p: Profile) => string | null }
  | { kind: "tags"; title: string; value: (p: Profile) => string[] };
 
export const SECTIONS: Section[] = [
  { kind: "fields", title: "基本情報", fields: ["started_on", "prefecture", "grade"] },
  { kind: "fields", title: "学歴", fields: ["high_school", "university"] },
  { kind: "tags", title: "タグ", value: (p) => p.tags ?? [] },
];
 
export function getField(key: FieldKey): FieldDef {
  return FIELDS[key];
}
 
export function visibilityOf(
  map: Partial<Record<FieldKey, Visibility>>,
  key: FieldKey,
): Visibility {
  return map[key] ?? "public";
}
