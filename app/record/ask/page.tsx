import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { jstInputToUtcISO } from "@/lib/datetime";
import { getImageFile, getText, parseVisibility } from "@/lib/post-form";
import {
  buildPostImagePath,
  removePostImage,
  uploadPostImage,
} from "@/lib/post-image";
import type { TablesInsert } from "@/lib/database.types";
import DateTimeInput from "../datetime";
import Visibility from "../visibility";
import Comment from "../Comment";
import ImageInput from "../ImageInput";
import Question from "./Question";

export default async function TextbookDetailPage(){
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 未ログインなら proxy 側でもリダイレクトされるが、ここでも必ず止める。
    // (user が null のまま user_id に undefined を入れると insert が落ちる)
    if (!user) {
      redirect("/login");
    }

    // サーバーアクションは入れ子の関数なので、外側の絞り込み(user が null でない)が
    // そのままでは中に伝わらない。ここで string として取り出しておく。
    const userId = user.id;

  async function handleSubmit(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const raw = Object.fromEntries(formData);
    const date = raw.date as string;
    const time = raw.time as string;

    // 入力された日時は JST として解釈して UTC に直す。
    // new Date(`${date}T${time}`) と書くとサーバーのローカルTZ解釈になり、
    // 開発機(JST)では動いて Vercel(UTC)では9時間ずれる。
    // TODO: 日時が空/不正なときは弾く (機能定義書 F-03 の例外条件)
    const studiedAtISO =
      jstInputToUtcISO(date, time) ?? new Date().toISOString();


    // post_id をここで決めてしまう。画像のパスに post_id が要る
    // (公開範囲を画像にも効かせるため) が、insert の戻りを待つと
    // アップロードが後追いになり、失敗時の巻き戻しが増えるため。
    const postId = crypto.randomUUID();
    const imageFile = await getImageFile(raw.image);
    let imagePath: string | null = null;

    if (imageFile) {
      imagePath = buildPostImagePath(userId, postId);
      await uploadPostImage(supabase, imagePath, imageFile);
    }

    const record_post: TablesInsert<"posts"> = {
      post_id: postId,
      user_id: userId,
      type: "ask",
      note: getText(raw.comment),
      visibility: parseVisibility(raw.visibility),
      created_at: studiedAtISO,
      image: imagePath,
    };

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert(record_post)
      .select("post_id")
      .single();

    if (postError || !post) {
      console.error("posts insert failed:", postError);
      if (imagePath) {
        await removePostImage(supabase, imagePath);
      }
      throw new Error(`posts insert failed: ${postError?.message}`);
    }

    const record_record: TablesInsert<"post_ask"> = {
      post_id: post.post_id,
      // TODO(D-3): 空のまま送信できてしまう。バリデーションは後続で入れる
      question: getText(raw.question) ?? "",
    };

    const { error: childError } = await supabase
      .from("post_ask")
      .insert(record_record);

    if (childError) {
      // 子テーブルの insert に失敗すると posts だけが残る (孤児レコード)。
      // 本来は1トランザクションにまとめるべきで、これはそれまでの応急処置。
      console.error("post_ask insert failed:", childError);
      await supabase.from("posts").delete().eq("post_id", post.post_id);
      if (imagePath) {
        await removePostImage(supabase, imagePath);
      }
      throw new Error(`post_ask insert failed: ${childError.message}`);
    }

    redirect("/record");
  }

  return (
    <form action={handleSubmit}>
    <div className="flex items-center gap-3 p-3">
    <Link href="/record">戻る</Link>
    <h1 className="grow text-center">疑問の入力</h1>
    <input type="submit" value="送信" />
    </div>

    <div className="flex flex-col justify-stretch gap-4 p-6">
      <Visibility />
      <DateTimeInput />
      <Question />
      <Comment />
      <ImageInput />
    </div>

    </form>
  );
}