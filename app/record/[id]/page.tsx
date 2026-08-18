import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation"; // 404ページを出すための機能

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
  params: { id: string };
}) {
  const supabase = await createClient();

  // 1. URLの /record/123 から "123" を取り出す
  const textbookId = params.id;

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

  // 4. 無事にデータが取れたら画面を表示する
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-zinc-800">
        {textbook.name}
      </h1>
      
      <p className="text-zinc-500">
        これは ID: {textbook.id} の教材の専用ページです。
      </p>

      {/* ここに教材の中身や設定画面などを自由に作っていく */}

    </div>
  );
}