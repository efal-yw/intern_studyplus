import type { Database } from "@/lib/database.types";

/**
 * 投稿フォーム (record / ask / knowledge) の共通処理。
 * FormData の値は string | File で、そのままでは DB の型に入らないため、ここで整える。
 */

/** DB の visibility_scope enum。値を増やすとここが型エラーになる */
export type Visibility = Database["public"]["Enums"]["visibility_scope"];

/**
 * 公開範囲の選択肢。value は必ず DB の enum と一致する。
 * ※ 以前 "followers" という DB に存在しない値を送っていて insert が失敗していた。
 *    型を DB から引くことで同じ事故を防ぐ。
 */
export const VISIBILITY_OPTIONS: ReadonlyArray<{ value: Visibility; label: string }> = [
  { value: "private", label: "非公開" },
  { value: "ff", label: "フォロワー" },
  { value: "public", label: "全体" },
];

/** フォームから来た公開範囲を検証する。不正な値なら安全側 (非公開) に倒す */
export function parseVisibility(value: FormDataEntryValue | undefined): Visibility {
  const option = VISIBILITY_OPTIONS.find((o) => o.value === value);
  return option ? option.value : "private";
}

/** FormData の値をテキストとして取り出す。File・空文字は null */
export function getText(value: FormDataEntryValue | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * 未入力なら null を返す。
 * 「0時間0分と入力した」と「そもそも入力していない」をDB上で区別するため、
 * 未入力を 0 に丸めない。
 */
export function toNullableInt(value: FormDataEntryValue | undefined): number | null {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * コメント本文の最大文字数。
 * UI の maxLength・サーバーアクションの検証・DB の CHECK 制約
 * (comments_contents_length) の3箇所で同じ値を使う。
 */
export const COMMENT_MAX_LENGTH = 500;

/**
 * コメント本文の文字数。
 * .length は UTF-16 の要素数なので絵文字などが2文字に数えられる。
 * DB 側の char_length() と数え方を揃えるため、コードポイントで数える。
 */
export function countChars(text: string): number {
  return [...text].length;
}
