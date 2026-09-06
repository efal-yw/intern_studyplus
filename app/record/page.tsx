import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import AddCategory from "./AddCategory"
import AddTextbook from "./AddTextbook"
import { EditModeProvider, EditToggleButton, EditModeVisible } from "./EditMode"


type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// 実スキーマから引く。id は uuid なので number ではなく string
type Textbook = Pick<Tables<"textbook">, "id" | "name" | "category">;

// [カテゴリー名, カテゴリーID, そのカテゴリーの教材一覧]
type CategoryWithTextbooks = [string | null, string, Textbook[]];

async function Record_by_category(
  textbook_category_id: string,
  supabase: SupabaseServerClient,
): Promise<Textbook[]> {
  const { data: textbooks_by_category }  = await supabase
    .from("textbook")
    .select("id, name, category")
    .eq("category", textbook_category_id);
  //retrieve textbooks by category

  return textbooks_by_category ?? [];
}


async function RecordList(user: User, supabase: SupabaseServerClient) {
  const { data: textbook_categories }  = await supabase
    .from("category_textbook")
    .select("id, category_name")
    .eq("user_id", user.id);
  // retrieve categories of textbooks


  const category_and_textbooks: CategoryWithTextbooks[] = await Promise.all(
    (textbook_categories ?? []).map(
      async (category): Promise<CategoryWithTextbooks> => [
        category.category_name,
        category.id,
        await Record_by_category(category.id, supabase),
      ]
    )
  );

  function ShowItems({ items }: { items: CategoryWithTextbooks }) {
    return (
     <div className="flex flex-col items-start justify-start gap-3">
      <div className="flex w-full items-center justify-between">
       <label>{items[0]}</label>
       <EditModeVisible>
         <AddTextbook user={user} category={items[1]} />
       </EditModeVisible>
       </div>

        <div className="grid grid-cols-4">
          {items[2].map((textbook) => (
            <Link key={textbook.id} href={`/record/${textbook.id}`} >{textbook.name}</Link>
          ))}
        </div>
     </div>
    );
  }


  return (
    <>
      {category_and_textbooks.map((items, index) => (
        <ShowItems key={index} items={items} />
      ))}
    </>
  );
}




export default async function RecordPage() {
  const supabase = await createClient();
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    const e = err as { message?: string; cause?: unknown };
    console.error("getUser failed:", e?.message, "cause:", e?.cause);
  }

  // 未ログインなら proxy 側でもリダイレクトされるが、ここでも必ず止める。
  // (getUser が失敗して user が null のまま user.id を読むとクラッシュするため)
  if (!user) {
    redirect("/login");
  }

  return (
    <EditModeProvider>
      <div className="flex flex-1 flex-col justify-start gap-6 p-6">
        <div className="flex justify-end">
          <EditToggleButton />
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/record/ask">ask</Link>
          <Link href="/record/knowledge">knowledge</Link>
        </div>
        {await RecordList(user, supabase)}
        <EditModeVisible>
          <AddCategory user={user} />
        </EditModeVisible>
      </div>
    </EditModeProvider>
  );
}
