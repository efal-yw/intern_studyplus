import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { IMAGE_MIME } from "@/lib/post-form";

/**
 * 教材アイコン (icons テーブル + textbook_icons バケット) の置き場所と URL。
 *
 * icons.icon_path には「バケット内のパス」だけを入れる。バケットは固定なので
 * 名前を持たせる必要がなく、RLS 側の前方一致 (icon_path like auth.uid() || '/%')
 * を素直に書けるようにするため。
 *
 *   shared/<uuid>.webp      … プリセット。全員が選べる
 *   <user_id>/<uuid>.webp   … ユーザーがアップロードしたもの
 *
 * バケットは public 読みなので、表示URLは通信も認証もせずに組み立てられる。
 * 防御は「ファイル名の uuid が推測できないこと」に乗っている。
 */

// アップロードはブラウザ、表示はサーバーから呼ぶので、生成関数の戻り値ではなく型で受ける
type AnySupabaseClient = SupabaseClient<Database>;

export const TEXTBOOK_ICON_BUCKET = "textbook_icons";

/** 全員が選べるアイコンの置き場所。アプリからは書けない (ポリシーが弾く) */
export const SHARED_ICON_PREFIX = "shared/";

/**
 * アップロードするアイコンのパス: <user_id>/<uuid>.webp
 *
 * 1段目が持ち主。storage.objects と icons の両方のポリシーがここを見るので、
 * 形を変えるときは両方直すこと。
 */
export function buildTextbookIconPath(userId: string) {
  return `${userId}/${crypto.randomUUID()}.webp`;
}

/**
 * 表示用のURL。public バケットの公開URLは形が決まっているので、
 * getPublicUrl() と違って通信も認証もせずに組み立てられる
 * (= Server / Client どちらからでも使えて、async にする必要がない)。
 * URL の形は next.config.ts の remotePatterns と対。
 */
export function textbookIconUrl(iconPath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${TEXTBOOK_ICON_BUCKET}/${iconPath}`;
}

/** アップロードしてバケット内のパスを返す。失敗したら投げる */
export async function uploadTextbookIcon(
  supabase: AnySupabaseClient,
  path: string,
  file: File,
) {
  const { data, error } = await supabase.storage
    .from(TEXTBOOK_ICON_BUCKET)
    .upload(path, file, {
      // file.type ではなく固定値を渡す。file.type は送る側の申告値で、
      // text/html などを指定されると Storage がその Content-Type で配信し、
      // public バケットなので supabase.co 上で任意の HTML が開く状態になる。
      // ここに置くのは compressImage() を通った webp だけと決まっている。
      contentType: IMAGE_MIME,
      // パスはアップロードごとに一意で、あとから差し替えることもない
      cacheControl: "31536000",
    });

  if (error) {
    console.error("textbook icon upload failed:", error.message, error);
    throw new Error(`textbook icon upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * 後片付け。icons の insert に失敗したときなどに呼ぶ。
 * ここで失敗しても処理の成否には影響しない (孤児ファイルが残るだけ) ので投げない。
 *
 * プリセットは全ユーザーの共有物なので、shared/ 配下は触らない
 * (ポリシーでも弾かれるが、呼ぶ前に止める)。
 */
export async function removeTextbookIcon(
  supabase: AnySupabaseClient,
  path: string,
) {
  if (path.startsWith(SHARED_ICON_PREFIX)) {
    return;
  }

  const { error } = await supabase.storage
    .from(TEXTBOOK_ICON_BUCKET)
    .remove([path]);

  if (error) {
    console.warn("failed to remove textbook icon:", path, error.message);
  }
}

/**
 * icons に1行足して id を返す。失敗したら投げる。
 *
 * textbook.icon はこの id を指す外部キーなので、教材より先にこちらを作る。
 * 順番を逆にすると必ず FK 違反 (23503) になる。
 */
export async function insertIconRow(
  supabase: AnySupabaseClient,
  path: string,
  name: string | null,
) {
  const { data, error } = await supabase
    .from("icons")
    .insert({ icon_path: path, name })
    .select("id")
    .single();

  if (error) {
    console.error("icons insert failed:", error.message, error);
    throw new Error(`icons insert failed: ${error.message}`);
  }

  return data.id;
}

/**
 * icons から1行消す。アイコンを作った直後の巻き戻し用。
 * 失敗しても投げない (孤児行が残るだけ)。
 */
export async function removeIconRow(
  supabase: AnySupabaseClient,
  iconId: string,
) {
  const { error } = await supabase.from("icons").delete().eq("id", iconId);

  if (error) {
    console.warn("failed to remove icon row:", iconId, error.message);
  }
}
