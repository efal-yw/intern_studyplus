import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../_components/SignOutButton";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();
    name = profile?.name ?? null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      {name && <p className="text-lg font-semibold text-black">{name}</p>}
      <p className="text-zinc-500">マイページ画面</p>
      <SignOutButton />
    </div>
  );
}
