"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {useParams} from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FollowButton } from "../follow";
import { toggleFollow } from "../followActions";

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

function StatusMessage({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2">
      {profile.status_message ? (
        <p>{profile.status_message}</p>
      ) : (
        <p>ステータスメッセージは設定されていません</p>
      )}
    </div>
  );
}

export default function UserProfilePage(){
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams<{ id: string }>();
  const id = params.id;

  // フォローを切り替えたあと、この値を進めて effect を再実行させる(= 取り直す)。
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const viewer = user?.id ?? null;
      setViewerId(viewer);

      const { data, error } = await supabase
        .from("users")
        .select("name, following_count, follower_count, status_message")
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setProfile({
        name: data?.name ?? null,
        following_count: data?.following_count ?? null,
        follower_count: data?.follower_count ?? null,
        status_message: data?.status_message ?? null,
      });

      if (viewer) {
        // from_user_id = フォローする側(自分), to_user_id = フォローされる側(この人)。
        // フォローしていない = 0件が正常系なので、エラーにならない maybeSingle を使う。
        const { data: follow } = await supabase
          .from("ff")
          .select("id")
          .eq("from_user_id", viewer)
          .eq("to_user_id", id)
          .maybeSingle();

        setIsFollowing(!!follow);
      }

      setIsLoading(false);
    }

    loadProfile();
  }, [id, reloadToken]);

  // 先に表示を切り替えてからサーバーに送る。往復(200ms前後)を待つと
  // 「押しても反応しない」ように見えるため。
  // 完了後に取り直すのは、フォロワー数がDBのトリガー側で増減するから。
  // 失敗したときは取り直しでボタンが勝手に戻るので、理由を出さないと
  // 「押しても戻るだけ」にしか見えない。
  async function handleToggleFollow(nextFollowing: boolean) {
    setFollowError(null);
    setIsFollowing(nextFollowing);

    const { error } = await toggleFollow(id, nextFollowing);

    if (error) {
      setFollowError(error);
    }

    setReloadToken((token) => token + 1);
  }

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

  if (!profile) {
    return null;
  }

  // 未ログインのときと自分のプロフィールを見ているときはボタンを出さない。
  const canFollow = viewerId !== null && viewerId !== id;

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col items-start gap-4 justify-start">
        <div className="flex flex-1 items-center gap-3">
        <Image
          src="/favicon.ico"
          alt="favicon"
          width={32}
          height={32}
          className="aspect-square rounded-full"
        />
        {canFollow && (
          <FollowButton
            isFollowing={isFollowing}
            onToggle={handleToggleFollow}
          />
        )}
        </div>
        {followError && (
          <p className="text-sm text-red-600">{followError}</p>
        )}
        {profile.name && (
          <p className="text-lg font-semibold text-black">{profile.name}</p>
        )}
        <StatusMessage profile={profile} />
        <ProfileStats profile={profile} />
      </div>

      <Link href="/" >x</Link>

    </div>
  );
}
