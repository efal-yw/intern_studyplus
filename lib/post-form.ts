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
 * FormData の値をファイルとして取り出す。未選択のとき input は
 * サイズ0の File を送ってくるので、それも null 扱いにする。
 */
export function getFile(value: FormDataEntryValue | undefined): File | null {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

/**
 * 画像は webp だけを受け取る。
 *
 * クライアント側 (lib/image.ts) が必ず webp に変換して 300KB 以下まで縮めるので、
 * 正規の経路ならこの条件は自動的に満たされる。ここで改めて検査するのは、
 * Server Action が UI を通さない POST でも叩けるため。
 *
 * MIME とバイト数の上限は lib/image.ts の AVATAR_LIMITS / POST_IMAGE_LIMITS が
 * 参照する。数字をここに置いているのは、lib/image.ts が
 * browser-image-compression を import していてサーバー側から読めないため。
 */
export const IMAGE_MIME = "image/webp";
export const IMAGE_MAX_BYTES = 300 * 1024;

/**
 * 先頭12バイトが webp の形をしているか。
 * RIFF####WEBP (#### はファイルサイズ) という構造になっている。
 *
 * file.type は multipart のヘッダに書かれた申告値でしかなく、送る側が
 * 自由に詐称できる。実バイト列を見ないと「拡張子と Content-Type だけ webp の
 * 別形式」を止められない。
 */
async function looksLikeWebp(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (head.length < 12) {
    return false;
  }

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...head.subarray(start, end));

  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

/**
 * FormData の値を画像として取り出す。未選択なら null。
 * 受け取れない形式・大きさなら投げる (投稿自体を成立させない)。
 */
export async function getImageFile(
  value: FormDataEntryValue | undefined,
): Promise<File | null> {
  const file = getFile(value);

  if (!file) {
    return null;
  }

  if (file.type !== IMAGE_MIME) {
    throw new Error(`unsupported image type: ${file.type}`);
  }

  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`image too large: ${file.size} bytes`);
  }

  if (!(await looksLikeWebp(file))) {
    throw new Error("image content does not look like webp");
  }

  return file;
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
