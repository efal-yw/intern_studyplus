import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../_components/SignOutButton";
import Image from "next/image";

async function Status_Message(supabase: SupabaseClient, userId: string, message: string) {
  const { data } = await supabase
    .from("users")
    .update({ status_message: message })
    .eq("id", userId)
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  let following_count: number | null = null;
  let follower_count: number | null = null;
  let status_message: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("name, following_count, follower_count, status_message")
      .eq("id", user.id)
      .single();
    name = profile?.name ?? null;
    following_count = profile?.following_count ?? null;
    follower_count = profile?.follower_count ?? null;
    status_message = profile?.status_message ?? null;
  }






  return (
    <div className="flex flex-1 flex-col gap-4 p-6">

      <div className="flex flex-col items-start gap-4 justify-start">
        <Image
          src="/favicon.ico"
          alt="favicon"
           width={32}
           height={32}
          className="aspect-square rounded-full"
        />
        {profile?.name && (
          <p className="text-lg font-semibold text-black">{profile.name}</p>
        )}
        <StatusMessage />
        {profile && <ProfileStats profile={profile} />}
      </div>

      <SignOutButton />
    </div>
  );
}