import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation"; // 404ページを出すための機能
import { jstInputToUtcISO } from "@/lib/datetime";
import { getText, parseVisibility, toNullableInt } from "@/lib/post-form";
import type { TablesInsert } from "@/lib/database.types";
import DateTimeInput from "../datetime";
import StudyTimeLength from "./studyTimeLength";
import Comment from "../Comment";
import Visibility from "../visibility";

// params という特殊な箱から、URLの [id] の部分を受け取る
export default async function TextbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  // 1. URLの /record/123 から "123" を取り出す
  const { id: textbookId } = await params;

  // 2. Supabaseに「idが一致する教材を1個だけちょうだい」とお願いする
  const { data: textbook, error } = await supabase
    .from("textbook")
    .select("*")
    .eq("id", textbookId)
    .single(); // 👈 1件だけ取得するための魔法のメソッド

  // 3. もしエラーになったり、教材が存在しなかったら 404 ページに飛ばす
  if (error || !textbook) {
    notFound();
  }


  //　上まではAIにかいてもらったにょ。

  // TODO(A-3): ここは「教材の持ち主」であってログインユーザーではない。
  // RLS が効いていないと、URL の id を変えるだけで他人名義の投稿ができてしまう。
  const userId = textbook.user_id;

  async function handleSubmit(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const raw = Object.fromEntries(formData);
    const date = raw.date as string;
    const time = raw.time as string;

    // 入力された日時は JST として解釈して UTC に直す。
    // new Date(`${date}T${time}`) と書くとサーバーのローカルTZ解釈になり、
    // 開発機(JST)では動いて Vercel(UTC)では9時間ずれる。
    // TODO(D-3): 日時が空/不正なときは弾く (機能定義書 F-03 の例外条件)
    const studiedAtISO =
      jstInputToUtcISO(date, time) ?? new Date().toISOString();

    const record_post: TablesInsert<"posts"> = {
      user_id: userId,
      type: "record",
      note: getText(raw.comment),
      visibility: parseVisibility(raw.visibility),
      created_at: studiedAtISO,
    };

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert(record_post)
      .select("post_id")
      .single();

    if (postError || !post) {
      console.error("posts insert failed:", postError);
      throw new Error(`posts insert failed: ${postError?.message}`);
    }

    const record_record: TablesInsert<"post_record"> = {
      post_id: post.post_id,
      hours: toNullableInt(raw.hours),
      minutes: toNullableInt(raw.minutes),
      textbook: textbookId,
    };

    const { error: recordError } = await supabase
      .from("post_record")
      .insert(record_record);

    if (recordError) {
      // 子テーブルの insert に失敗すると posts だけが残る (孤児レコード)。
      // 本来は1トランザクションにまとめるべきで、これはそれまでの応急処置。
      console.error("post_record insert failed:", recordError);
      await supabase.from("posts").delete().eq("post_id", post.post_id);
      throw new Error(`post_record insert failed: ${recordError.message}`);
    }

    redirect("/record");
  }

  return (
    <form action={handleSubmit}>
    <div className="flex items-center gap-3 p-3">
    <Link href="/record">戻る</Link>
    <h1 className="grow text-center">記録の入力</h1>
    <input type="submit" value="記録" />
    </div>

    <div className="flex flex-col justify-stretch gap-4 p-6">
      <div className="flex items-center justify-center gap-2">
      <p className="text-2xl font-bold text-zinc-800">
        {textbook.name}
      </p>
      </div>
      <Visibility />
      <DateTimeInput />
      <StudyTimeLength />
      <Comment />
    </div>

    </form>
  );
}
