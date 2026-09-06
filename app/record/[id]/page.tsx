import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation"; // 404ページを出すための機能
import DateTimeInput from "./datetime";
import StudyTimeLength from "./studyTimeLength";
import StudyComment from "./studyComment";
import Visibility from "./visibility";

// 型定義（一覧ページと同じもの）
type Textbook = {
  id: number;
  user_id: string;
  name: string;
};

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

  const userId = textbook.user_id;

  async function handleSubmit(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const raw = Object.fromEntries(formData);
    const date = raw.date as string;
    const time = raw.time as string;
    const hours = raw.hours as string | undefined;
    const minutes = raw.minutes as string | undefined;

    const record_post = {
      user_id: userId,
      type: "record",
      note: raw.studyComment,
      visibility: raw.visibility,
      created_at: new Date(`${date}T${time}`).toISOString(),
    };

    const { data: post, error: error3 } = await supabase
      .from("posts")
      .insert(record_post)
      .select("post_id")
      .single();


    const record_record = {
      post_id: post.post_id,
      hours: hours ? parseInt(hours) : 0,
      minutes: minutes ? parseInt(minutes) : 0,
      textbook: textbookId
    };

    const { error: error2 } = await supabase
      .from("post_record")
      .insert(record_record);

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
      <StudyComment />
    </div>

    </form>
  );
}