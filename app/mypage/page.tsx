import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../_components/SignOutButton";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const username =
    typeof user?.user_metadata?.username === "string"
      ? user.user_metadata.username
      : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      {username && (
        <p className="text-lg font-semibold text-black">{username}</p>
      )}
      <p className="text-zinc-500">マイページ画面</p>
      <SignOutButton />
    </div>
  );
}
