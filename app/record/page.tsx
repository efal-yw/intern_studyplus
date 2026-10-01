import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import TextbookIcon from "@/app/_components/TextbookIcon";
import AddCategory from "./AddCategory";
import AddTextbook from "./AddTextbook";
import {
  EditModeProvider,
  EditToggleButton,
  EditModeVisible,
} from "./EditMode";
import {
  MessageCircleQuestionMark,
  BookOpenText,
  Bookmark,
} from "lucide-react";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// 実スキーマから引く。id は uuid なので number ではなく string。
// アイコンは icons テーブルに分かれたので、FK 経由で埋め込んだ形で持つ。
type Textbook = Pick<Tables<"textbook">, "id" | "name" | "category"> & {
  iconPath: string | null;
};

type CategoryWithTextbooks = {
  id: string;
  name: string | null;
  textbooks: Textbook[];
};

// user_id も条件に入れる。category_textbook 側は自分の行しか引いていないので
// 通常ここに他人のカテゴリIDは来ないが、textbook の RLS がどうなっていても
// 「自分の教材しか出ない」が成立するようにしておく。
async function fetchCategoriesWithTextbooks(
  userId: string,
  supabase: SupabaseServerClient,
): Promise<CategoryWithTextbooks[]> {
  const { data: categories, error: categoriesError } = await supabase
    .from("category_textbook")
    .select("id, category_name")
    .eq("user_id", userId);

  if (categoriesError) {
    console.error("failed to fetch textbook categories:", categoriesError);
    return [];
  }

  if (!categories || categories.length === 0) {
    return [];
  }

  // カテゴリごとに1本ずつ投げると N+1 になるので、まとめて1回で取ってから
  // JS 側で束ね直す。
  const { data: textbooks, error: textbooksError } = await supabase
    .from("textbook")
    .select("id, name, category, icons(icon_path)")
    .in(
      "category",
      categories.map((category) => category.id),
    )
    .eq("user_id", userId);

  if (textbooksError) {
    // カテゴリだけは出せるので、教材が0件の状態で描画を続ける
    console.error("failed to fetch textbooks:", textbooksError);
  }

  const byCategory = new Map<string, Textbook[]>();
  for (const textbook of textbooks ?? []) {
    if (!textbook.category) {
      continue;
    }
    const entry: Textbook = {
      id: textbook.id,
      name: textbook.name,
      category: textbook.category,
      iconPath: textbook.icons?.icon_path ?? null,
    };
    const bucket = byCategory.get(textbook.category);
    if (bucket) {
      bucket.push(entry);
    } else {
      byCategory.set(textbook.category, [entry]);
    }
  }

  return categories.map((category) => ({
    id: category.id,
    name: category.category_name,
    textbooks: byCategory.get(category.id) ?? [],
  }));
}

function CategorySection({
  category,
  user,
}: {
  category: CategoryWithTextbooks;
  user: User;
}) {
  return (
    <div className="flex flex-col items-start justify-start gap-3">
      <div className="flex w-full items-center justify-start gap-2">
        <Bookmark />
        <h2 className="font-bold">{category.name}</h2>
      </div>

      <div className="grid grid-cols-4">
        {category.textbooks.map((textbook) => (
          <Link
            key={textbook.id}
            href={`/record/${textbook.id}`}
            className="text-xs flex flex-col items-center justify-center gap-2"
          >
            {/* 隣に教材名が出ているので alt は空にする(読み上げの重複を避ける) */}
            <TextbookIcon iconPath={textbook.iconPath} size={64} />
            {textbook.name}
          </Link>
        ))}
        <EditModeVisible>
          <AddTextbook user={user} category={category.id} />
        </EditModeVisible>
      </div>
    </div>
  );
}

async function RecordList(user: User, supabase: SupabaseServerClient) {
  const categories = await fetchCategoriesWithTextbooks(user.id, supabase);

  return (
    <>
      {categories.map((category) => (
        <CategorySection key={category.id} category={category} user={user} />
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
          <Link href="/record/ask" className="font-bold flex gap-2">
            <MessageCircleQuestionMark />
            ask
          </Link>
          <Link href="/record/knowledge" className="font-bold flex gap-2">
            <BookOpenText />
            knowledge
          </Link>
        </div>
        {await RecordList(user, supabase)}
        <EditModeVisible>
          <AddCategory user={user} />
        </EditModeVisible>
      </div>
    </EditModeProvider>
  );
}
