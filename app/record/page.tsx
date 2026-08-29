import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddCategory from "./AddCategory"
import AddTextbook from "./AddTextbook"
import { EditModeProvider, EditToggleButton, EditModeVisible } from "./EditMode"


type Textbook = {
  id: number;               
  name: string | null;    
  category: string | null; 
};

async function Record_by_category(textbook_category_id,supabase) {
  const { data: textbooks_by_category, error }  = await supabase
    .from("textbook")
    .select("id, name, category")
    .eq("category", textbook_category_id);
  //retrieve textbooks by category
  
  return textbooks_by_category ?? [];
}


async function RecordList(user, supabase) {  
  const { data: textbook_categories, error }  = await supabase
    .from("category_textbook")
    .select("id, category_name")
    .eq("user_id", user.id);
  // retrieve categories of textbooks


  const category_and_textbooks: Array<[string | null, number, any]> = await Promise.all(
    (textbook_categories ?? []).map(async (category) => [
      category.category_name,
      category.id,
      await Record_by_category(category.id, supabase),
    ])
  );

  function ShowItems({ items }) {
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

  return (
    <EditModeProvider>
      <div className="flex flex-1 flex-col justify-start gap-6 p-6">
        <div className="flex justify-end">
          <EditToggleButton />
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/ask">ask</Link>
          <Link href="/knowledge">knowledge</Link>
        </div>
        {await RecordList(user, supabase)}
        <EditModeVisible>
          <AddCategory user={user} />
        </EditModeVisible>
      </div>
    </EditModeProvider>
  );
}
