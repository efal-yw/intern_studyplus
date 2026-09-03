import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
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

  return (
    <>
    <div className="flex items-center gap-3 p-3">
    <Link href="/record">戻る</Link>
    <h1 className="grow text-center">記録の入力</h1>
    <button>記録</button>
    </div>

    <div className="flex flex-col justify-stretch gap-4 p-6">
      <div className="flex items-center justify-stretch">
      <label>タイトル</label>
      <p className="text-2xl font-bold text-zinc-800">
        {textbook.name}
      </p>
      </div>
      <Visibility />
      <DateTimeInput />
      <StudyTimeLength />
      <StudyComment />
    </div>

    </>
  );
}