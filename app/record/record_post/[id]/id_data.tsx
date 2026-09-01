"use server"
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation"; // 404ページを出すための機能

// 型定義（一覧ページと同じもの）
type Textbook = {
  id: number;
  user_id: string;
  name: string;
};

// params という特殊な箱から、URLの [id] の部分を受け取る
export async function TextbookDetail({
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

  return (textbook);
}