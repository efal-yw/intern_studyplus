"use client"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AddTextbook({ user, category }: { user: User; category: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  const router = useRouter();
  const supabase = createClient();
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsOpen(false)

    const { error } = await supabase
      .from("textbook")
      .insert({user_id: user.id, name: inputText, category: category});

    if (error) {
      console.error("AddTextbook insert error:", error.message, error);
      return;
    }

    router.refresh()
  };

  return (
    <>
    <button onClick={()=>setIsOpen(true)}>教材を追加</button>
    {isOpen && (
      <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center" onClick={()=>setIsOpen(false)}>
      <div onClick={(e) => e.stopPropagation()}>
      <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center gap-4 bg-white">
        <label htmlFor="textbook-name">教材を追加</label>
        <input id="textbook-name" type="text"
        value={inputText}
        onChange={(e)=>setInputText(e.target.value)}
        required
        placeholder="名前を入力"
        />
        <button type="button" onClick={()=>setIsOpen(false)}>戻る</button>
        <button type="submit">保存</button>
      </form>
      </div>
      </div>
    )}
    </>
  );
}
