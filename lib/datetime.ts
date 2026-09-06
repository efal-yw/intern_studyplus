/**
 * 日時の扱いは「保存は UTC / 入力と表示は JST 固定」で統一する。
 * (技術スタック選定書 7章の非機能要件)
 */

/** 日本標準時のUTCオフセット */
const JST_OFFSET = "+09:00";

/**
 * <input type="date"> と <input type="time"> の値を JST として解釈し、
 * UTC の ISO 文字列に変換する。
 *
 * 直接 new Date(`${date}T${time}`) と書いてはいけない。
 * タイムゾーン指定のない日時文字列は「サーバーのローカルタイムゾーン」として
 * 解釈されるため、開発機 (JST) では正しく動き、Vercel の実行環境 (UTC) では
 * 9時間ずれる。ローカルでは絶対に再現しない種類のバグになる。
 *
 * @returns 変換できなければ null
 */
export function jstInputToUtcISO(
  date: string | undefined,
  time: string | undefined,
): string | null {
  if (!date || !time) {
    return null;
  }

  // <input type="time"> の値は "HH:MM" だが、step 指定次第で "HH:MM:SS" にもなる
  const normalizedTime = time.length === 5 ? `${time}:00` : time;

  const parsed = new Date(`${date}T${normalizedTime}${JST_OFFSET}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}
