import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../_components/SignOutButton";
import Image from "next/image";
export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  let following_count: number | null = null;
  let follower_count: number | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("name, following_count, follower_count")
      .eq("id", user.id)
      .single();
    name = profile?.name ?? null;
    following_count = profile?.following_count ?? null;
    follower_count = profile?.follower_count ?? null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">

      <div className="flex flex-col items-start gap-4 justify-start">
        <Image
          src="/favicon.ico"
          alt="favicon"
           width={32}
           height={32}
           className="size-square rounded-full"
        />
        {name && <p className="text-lg font-semibold text-black">{name}</p>}
        <div className="flex items-center gap-2">
          <p><strong>{following_count} </strong>フォロー中</p>
          <p>|</p>
          <p><strong>{follower_count} </strong>フォロワー</p>
        </div>
      </div>


      <SignOutButton />
    </div>
  );
}