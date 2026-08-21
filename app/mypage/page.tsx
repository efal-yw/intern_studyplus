import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../_components/SignOutButton";
import Image from "next/image";
import { useState } from "react";

type Profile = {
  name: string | null;
  following_count: number | null;
  follower_count: number | null;
  status_message: string | null;
};

async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, following_count, follower_count, status_message")
    .eq("id", user.id)
    .single();

  return {
    name: profile?.name ?? null,
    following_count: profile?.following_count ?? null,
    follower_count: profile?.follower_count ?? null,
    status_message: profile?.status_message ?? null,
  };
}




function ProfileStats({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2">
      <p>
        <strong>{profile.following_count} </strong>フォロー中
      </p>
      <p>|</p>
      <p>
        <strong>{profile.follower_count} </strong>フォロワー
      </p>
    </div>
  );
}

function StatusMessage({ profile }: { profile: Profile }, supabase: any, user: any) {
  const [onEdit, setOnEdit] = useState(false);
  
  async function EditHandleClick(setOnEdit: React.Dispatch<React.SetStateAction<boolean>>, onEdit: boolean) {
    setOnEdit(!onEdit);
    const nextStatusMessage = document.getElementById("status-message")?.value || "";
    const { data: profile, error } = await supabase
    .from("users")
    .update({ status_message: nextStatusMessage })
    .eq("id", user.id)
  }

  return (
    <>
      {!onEdit ? (
        profile?.status_message ? (
          <p>{profile.status_message}</p>
        ) : (
          <p>ステータスメッセージは設定されていません</p>
        )
      ) :
        <input id="status-message" type="text" placeholder="編集中" />
      }
      <button onClick={() => EditHandleClick(setOnEdit, onEdit)}>{!onEdit ? "編集" : "保存"}</button>
    </>
  );
}


export default async function MyPage() {
  const profile = await getProfile();

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
