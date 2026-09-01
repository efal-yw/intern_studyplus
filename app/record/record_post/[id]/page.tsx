import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation"; // 404ページを出すための機能
import { TextbookDetail } from "./id_data";

// 型定義（一覧ページと同じもの）
type Textbook = {
  id: number;
  user_id: string;
  name: string;
};

// params という特殊な箱から、URLの [id] の部分を受け取る
export default async function TextbookPage(){
  const textbook :Textbook= await TextbookDetail(Number(params.id));
  return (
    <>
    <div className="flex items-start gap-3 p-3">
    <Link href="/record">戻る</Link>
    <h1 className="grow text-center">記録の入力</h1>
    <button>記録</button>
    </div>

    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-zinc-800">
        {textbook.name}
      </h1>
      
      <p className="text-zinc-500">
        これは ID: {textbook.id} の教材の専用ページです。
      </p>

      {/* ここに教材の中身や設定画面などを自由に作っていく */}

    </div>

    </>
  );
}