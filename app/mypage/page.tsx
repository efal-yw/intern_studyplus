"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "../_components/SignOutButton";

type Profile = {
  name: string | null;
  following_count: number | null;
  follower_count: number | null;
  status_message: string | null;
};

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

function StatusMessage({
  profile,
  userId,
  onSaved,
}: {
  profile: Profile;
  userId: string;
  onSaved: (statusMessage: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(profile.status_message ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEditStart() {
    setDraftMessage(profile.status_message ?? "");
    setError(null);
    setIsEditing(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ status_message: draftMessage })
      .eq("id", userId);

    setIsSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSaved(draftMessage);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        {profile.status_message ? (
          <p>{profile.status_message}</p>
        ) : (
          <p>ステータスメッセージは設定されていません</p>
        )}
        <button type="button" onClick={handleEditStart}>
          編集
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex items-center gap-2">
      <input
        type="text"
        value={draftMessage}
        onChange={(event) => setDraftMessage(event.target.value)}
        placeholder="編集中"
        disabled={isSaving}
      />
      <button type="submit" disabled={isSaving}>
        {isSaving ? "保存中..." : "保存"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

const uploadAvatar = async (file: File, userId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(userId, file, { upsert: true });

  if (error) {
    console.error("Error uploading user card:", error);
    throw new Error("Failed to upload user card");
  }

  return data.path;
};

function Avatar({ userId }: { userId: string }) {
  const supabase = createClient();
  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(userId);

  if (data?.publicUrl) {
    return (<Image src={data.publicUrl} alt="Avatar" width={32} height={32} className="aspect-square rounded-full" />);
  }
  return (<Image src="/favicon.ico" alt="favicon" width={32} height={32} className="aspect-square rounded-full" />);
}




export default function MyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("name, following_count, follower_count, status_message")
        .eq("id", user.id)
        .single();

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      setProfile({
        name: data?.name ?? null,
        following_count: data?.following_count ?? null,
        follower_count: data?.follower_count ?? null,
        status_message: data?.status_message ?? null,
      });
      setIsLoading(false);
    }

    loadProfile();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!profile || !userId) {
    return null;
  }


  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col items-start gap-4 justify-start">
        <Avatar userId={userId} />
        {profile.name && (
          <p className="text-lg font-semibold text-black">{profile.name}</p>
        )}
        <StatusMessage
          profile={profile}
          userId={userId}
          onSaved={(statusMessage) =>
            setProfile((prev) => (prev ? { ...prev, status_message: statusMessage } : prev))
          }
        />
        <ProfileStats profile={profile} />
      </div>

      <SignOutButton />
    </div>
  );
}
