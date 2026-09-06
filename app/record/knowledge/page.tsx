import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation"; // 404ページを出すための機能
import DateTimeInput from "../datetime";
import Visibility from "../visibility";
import Comment from "../Comment";

import Knowledge from "./knowledge";

// 型定義（一覧ページと同じもの）
type Textbook = {
  id: number;
  user_id: string;
  name: string;
};

// params という特殊な箱から、URLの [id] の部分を受け取る
export default async function TextbookDetailPage(){
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

  async function handleSubmit(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const raw = Object.fromEntries(formData);
    const date = raw.date as string;
    const time = raw.time as string;


    const record_post = {
      user_id: user?.id,
      type: "knowledge",
      note: raw.comment,
      visibility: raw.visibility,
      created_at: new Date(`${date}T${time}`).toISOString(),
    };

    const { data: post, error: error3 } = await supabase
      .from("posts")
      .insert(record_post)
      .select("post_id")
      .single();

    if (error3 || !post) {
      console.error("posts insert failed:", error3);
      throw new Error(`posts insert failed: ${error3?.message}`);
    }

    const record_record = {
      post_id: post.post_id,
      contents: raw.knowledge
    };

    const { error: error2 } = await supabase
      .from("post_knowledge")
      .insert(record_record);

    if (error2) {
      console.error("post_knowledge insert failed:", error2);
      throw new Error(`post_knowledge insert failed: ${error2.message}`);
    }

    redirect("/record");
  }

  return (
    <form action={handleSubmit}>
    <div className="flex items-center gap-3 p-3">
    <Link href="/record">戻る</Link>
    <h1 className="grow text-center">ナレッジの入力</h1>
    <input type="submit" value="送信" />
    </div>

    <div className="flex flex-col justify-stretch gap-4 p-6">
      <Visibility />
      <DateTimeInput />
      <Knowledge />
      <Comment />
    </div>

    </form>
  );
}