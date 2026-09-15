import type { createClient } from "@/lib/supabase/server";
import { IMAGE_MIME } from "@/lib/post-form";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const POST_IMAGE_BUCKET = "posts";

/** 署名URLの有効期限。タイムラインを開いている間もつ程度の長さがあればよい */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * 投稿画像のパス: <user_id>/<post_id>/<uuid>.webp
 *
 * 2番目のフォルダを post_id にしているのが肝。posts バケットは private で、
 * storage.objects の select ポリシーがこの部分を can_view_post() に渡すことで、
 * 「フォロワー限定の投稿の画像はフォロワーにしか署名できない」を成立させている。
 * パスの形を変えるときはポリシー側 ((storage.foldername(name))[2]) も直すこと。
 */
export function buildPostImagePath(userId: string, postId: string) {
  return `${userId}/${postId}/${crypto.randomUUID()}.webp`;
}

/** アップロードしてパスを返す。失敗したら投げる */
export async function uploadPostImage(
  supabase: SupabaseServerClient,
  path: string,
  file: File,
) {
  const { data, error } = await supabase.storage
    .from(POST_IMAGE_BUCKET)
    .upload(path, file, {
      // file.type ではなく固定値を渡す。file.type は送る側の申告値で、
      // text/html などを指定されると Storage がその Content-Type で配信し、
      // supabase.co 上で任意の HTML が開く状態になる。
      // ここに置くのは getImageFile() を通った webp だけと決まっている。
      contentType: IMAGE_MIME,
      // パスは投稿ごとに一意で、あとから差し替えることもない
      cacheControl: "31536000",
    });

  if (error) {
    console.error("post image upload failed:", error);
    throw new Error(`post image upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * 後片付け。insert に失敗して投稿が残らなかったときに呼ぶ。
 * ここで失敗しても投稿処理の成否には影響しない (孤児ファイルが残るだけ) ので投げない。
 */
export async function removePostImage(
  supabase: SupabaseServerClient,
  path: string,
) {
  const { error } = await supabase.storage
    .from(POST_IMAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.warn("failed to remove post image:", path, error);
  }
}

/**
 * 表示用の署名URLを作る。見る権限が無ければ null。
 *
 * private バケットなので getPublicUrl は使えない。createSignedUrl は
 * getPublicUrl と違って実際にサーバーと通信し、storage.objects の select
 * ポリシー (= can_view_post) を通ったときだけ URL を返す。
 */
export async function signPostImage(
  supabase: SupabaseServerClient,
  path: string | null,
) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(POST_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    // 権限が無い場合もここに来る。投稿自体は見えているので、画像だけ黙って隠す
    console.warn("failed to sign post image:", path, error);
    return null;
  }

  return data.signedUrl;
}
