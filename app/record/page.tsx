
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Textbook = {
  id: number;               
  user_id: string | null;  
  name: string | null;     
};

export default async function RecordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let textbooks: Textbook[] = [];

  if (user) {
    const { data, error } = await supabase
      .from("textbook")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      console.error("textbook fetch error:", error.message);
    }

    textbooks = (data ?? []) as Textbook[];
  }

  return (
    <div className="flex flex-1 flex-col items-start justify-start gap-6 p-6">
      <div className="flex flex-col gap-3">
        <Link href="/ask">ask</Link>
        <Link href="/knowledge">knowledge</Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {textbooks.map((textbook) => (
          <Link
            key={textbook.id}
            href={`/record/${textbook.id}`}
          >
            {textbook.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
