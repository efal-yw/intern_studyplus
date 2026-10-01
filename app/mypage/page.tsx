"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_LIMITS, compressImage } from "@/lib/image";
import { IMAGE_MIME } from "@/lib/post-form";
import Avatar from "../_components/Avatar";
import SignOutButton from "../_components/SignOutButton";
import UserTags from "./user_tags";

type Profile = {
  name: string | null;
  following_count: number | null;
  follower_count: number | null;
  status_message: string | null;
  avatar_path: string | null;
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

type ProfileDraft = {
  name: string;
  status_message: string | null;
  avatar_path: string | null;
};

function ProfileEditor({
  profile,
  userId,
  onSaved,
}: {
  profile: Profile;
  userId: string;
  onSaved: (draft: ProfileDraft) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name ?? "");
  const [draftMessage, setDraftMessage] = useState(
    profile.status_message ?? "",
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 選択中のファイルのプレビュー URL は使い終わったら必ず解放する
  function clearAvatarDraft() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleEditStart() {
    setDraftName(profile.name ?? "");
    setDraftMessage(profile.status_message ?? "");
    clearAvatarDraft();
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    clearAvatarDraft();
    setError(null);
    setIsEditing(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // users.name は NOT NULL なので空では保存できない
    const nextName = draftName.trim();
    if (!nextName) {
      setError("アカウント名を入力してください");
      return;
    }

    setIsSaving(true);
    setError(null);

    const previousPath = profile.avatar_path;
    let nextPath = previousPath;

    if (avatarFile) {
      try {
        nextPath = await uploadAvatar(avatarFile, userId);
      } catch (uploadError) {
        console.error(uploadError);
        setIsSaving(false);
        setError("アイコンのアップロードに失敗しました");
        return;
      }
    }

    const nextMessage = draftMessage.trim() || null;

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({
        name: nextName,
        status_message: nextMessage,
        avatar_path: nextPath,
      })
      .eq("id", userId);

    setIsSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    // DB が新しいパスを指した後で消す。逆順にすると、更新に失敗したときに
    // 参照先の無いパスが users に残ってしまう
    if (previousPath && previousPath !== nextPath) {
      void deleteAvatar(previousPath);
    }

    clearAvatarDraft();
    onSaved({
      name: nextName,
      status_message: nextMessage,
      avatar_path: nextPath,
    });
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Avatar avatarPath={profile.avatar_path} />
        {profile.name && (
          <p className="text-lg font-semibold text-black">{profile.name}</p>
        )}
        <p>
          {profile.status_message ?? "ステータスメッセージは設定されていません"}
        </p>
        <button type="button" onClick={handleEditStart}>
          プロフィールを編集
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-2">
        {avatarPreview ? (
          // blob: URL は Next.js の最適化サーバーから取得できないので unoptimized
          <Image
            src={avatarPreview}
            alt="新しいアイコンのプレビュー"
            width={32}
            height={32}
            unoptimized
            className="aspect-square rounded-full object-cover"
          />
        ) : (
          <Avatar avatarPath={profile.avatar_path} />
        )}
        <input
          type="file"
          accept="image/*"
          disabled={isSaving}
          onChange={handleAvatarChange}
        />
      </div>

      <input
        type="text"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        placeholder="アカウント名"
        disabled={isSaving}
      />
      <input
        type="text"
        value={draftMessage}
        onChange={(event) => setDraftMessage(event.target.value)}
        placeholder="ステータスメッセージ"
        disabled={isSaving}
      />

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={handleCancel} disabled={isSaving}>
          キャンセル
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

const uploadAvatar = async (file: File, userId: string) => {
  const compressed = await compressImage(file, AVATAR_LIMITS);

  // アップロードごとに新しいパスにする。URL が毎回変わるので上書きが起きず、
  // キャッシュを消す必要がない。先頭を user_id にしてあるのは Storage の
  // ポリシーが (storage.foldername(name))[1] で持ち主を判定できるようにするため。
  const path = `${userId}/${crypto.randomUUID()}.webp`;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, compressed, {
      // compressed.type ではなく固定値を渡す。申告値をそのまま渡すと
      // avatars は public バケットなので、text/html を指定して
      // supabase.co 上で任意の HTML を配信できてしまう。
      //
      // ※ このアップロードはブラウザから Storage へ直接飛ぶので、
      //   サーバー側で検証する余地がない。UI を通らない経路に効くのは
      //   バケット設定の allowed_mime_types / file_size_limit だけ。
      contentType: IMAGE_MIME,
      // パスが不変なので、期限を長く取って問題ない
      cacheControl: "31536000",
    });

  if (error) {
    console.error("Error uploading avatar:", error);
    throw new Error("Failed to upload avatar");
  }

  return data.path;
};

// 古いアイコンの後始末。DB を更新し終えた後に呼ぶ。
// 失敗してもユーザー体験には影響しない(孤児ファイルが残るだけ)ので投げない。
const deleteAvatar = async (path: string) => {
  const supabase = createClient();
  const { error } = await supabase.storage.from("avatars").remove([path]);
  if (error) {
    console.warn("Failed to remove the previous avatar:", path, error);
  }
};

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
        .select(
          "name, following_count, follower_count, status_message, avatar_path",
        )
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
        avatar_path: data?.avatar_path ?? null,
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
        <ProfileEditor
          profile={profile}
          userId={userId}
          onSaved={(draft) =>
            setProfile((prev) => (prev ? { ...prev, ...draft } : prev))
          }
        />
        <ProfileStats profile={profile} />
      </div>

      <SignOutButton />

      <UserTags userId={userId} />
    </div>
  );
}
