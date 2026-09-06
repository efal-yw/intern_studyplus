"use client"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AddCategory({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  const router = useRouter();
  const supabase = createClient();
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsOpen(false)

    const { error } = await supabase
      .from("category_textbook")
      .insert({user_id: user.id, category_name:inputText});

    if (error) {
      console.error("AddCategory insert error:", error.message, error);
      return;
    }

    router.refresh()
  };

  return (
    <>
    <button onClick={()=>setIsOpen(true)}>カテゴリーを追加</button>
    {isOpen && (
      <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center" onClick={()=>setIsOpen(false)}>
      <div onClick={(e) => e.stopPropagation()}>
      <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center gap-4 bg-white">
        <label htmlFor="category-name">カテゴリーを追加</label>
        <input id="category-name" type="text"
        value={inputText}
        onChange={(e)=>setInputText(e.target.value)}
        required
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
