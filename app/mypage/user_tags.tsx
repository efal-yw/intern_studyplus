"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil } from "lucide-react";

type UserTag = { tag_id: string; tags: { name: string } | null };
type Tag = { id: string; name: string };

// 同じ tag_id の要素が2つ入ると key={tag.tag_id} が衝突して React が警告を出し、
// 同じタグが2つ並ぶ。画面としては「付いている / 付いていない」しか意味が無いので、
// state に入れる直前に tag_id 単位にまとめる。
// setTags を呼ぶ場所が2つ (DB からの読み込みと保存後) あるので、両方に通す。
function dedupeByTagId(rows: UserTag[]): UserTag[] {
  return [...new Map(rows.map((row) => [row.tag_id, row])).values()];
}

// 編集フォーム。親の中ではなくモジュール直下に置く。
// レンダー関数の中で定義すると毎レンダーで別のコンポーネント扱いになり、
// 中の state が消える (react-hooks/static-components)。
//
// 「編集」を押したときにマウントして、閉じるときにアンマウントする。
// 初期値を props から1回だけ読む形にできるので、tags の読み込みが
// 終わる前に初期化してしまう問題が起きない。
function TagEditor({
  userId,
  tags,
  onSaved,
  onCancel,
}: {
  userId: string;
  tags: UserTag[];
  onSaved: (nextTags: UserTag[]) => void;
  onCancel: () => void;
}) {
  const [allTags, setAllTags] = useState<Tag[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    tags.map((tag) => tag.tag_id),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // タグ一覧の取得はレンダー中ではなく effect で行う。
  // レンダーのたびに走らせると描画ごとに通信が飛ぶ。
  useEffect(() => {
    async function loadAllTags() {
      const supabase = createClient();
      const { data, error } = await supabase.from("tags").select("id, name");

      if (error) {
        console.error(error);
        setError("タグ一覧の取得に失敗しました");
        return;
      }

      setAllTags(data ?? []);
    }

    loadAllTags();
  }, []);

  function toggle(tagId: string) {
    setSelectedIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  }

  async function handleSave() {
    if (!allTags) {
      return;
    }

    // 差分だけを撃つ。全消し→全入れにすると、途中で失敗したときに
    // 元々付いていたタグまで落ちる。
    const currentIds = tags.map((tag) => tag.tag_id);
    const added = selectedIds.filter((id) => !currentIds.includes(id));
    const removed = currentIds.filter((id) => !selectedIds.includes(id));

    setIsSaving(true);
    setError(null);

    const supabase = createClient();

    if (removed.length > 0) {
      const { error } = await supabase
        .from("user_tag")
        .delete()
        .eq("user_id", userId)
        .in("tag_id", removed);

      if (error) {
        console.error(error);
        setIsSaving(false);
        setError("タグの保存に失敗しました");
        return;
      }
    }

    if (added.length > 0) {
      const { error } = await supabase
        .from("user_tag")
        .insert(added.map((tagId) => ({ user_id: userId, tag_id: tagId })));

      if (error) {
        console.error(error);
        setIsSaving(false);
        setError("タグの保存に失敗しました");
        return;
      }
    }

    // 親に返す形を user_tag の select と同じ形にそろえる。
    // allTags に無い tag_id (RLS で tags が見えない等) は null にしておく。
    const tagById = new Map(allTags.map((tag) => [tag.id, tag]));
    const nextTags: UserTag[] = selectedIds.map((id) => {
      const tag = tagById.get(id);
      return { tag_id: id, tags: tag ? { name: tag.name } : null };
    });

    setIsSaving(false);
    onSaved(nextTags);
  }

  if (!allTags) {
    return (
      <p className="text-sm text-zinc-500">
        {error ?? "タグを読み込んでいます..."}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isSelected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              disabled={isSaving}
              onClick={() => toggle(tag.id)}
              className={`rounded-md p-1 text-sm ${
                isSelected ? "bg-zinc-600 text-zinc-100" : "bg-zinc-100"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={onCancel} disabled={isSaving}>
          キャンセル
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function UserTags({ userId }: { userId: string }) {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadTags() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_tag")
        .select("tag_id, tags(name)")
        .eq("user_id", userId);

      if (error) {
        console.error(error);
        return;
      }

      setTags(dedupeByTagId(data ?? []));
    }

    loadTags();
  }, [userId]);

  return (
    <div className="flex flex-col justify-start gap-2 bg-zinc-200 p-2 rounded-md">
      <div className="flex w-full items-center justify-between ">
        <h2 className="font-bold gap-2">タグ</h2>
        {!isEditing && (
          <button
            type="button"
            className="self-start"
            onClick={() => setIsEditing(true)}
          >
            <Pencil />
          </button>
        )}
      </div>
      {!isEditing ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.tag_id}
              className="mx-2 my-1 rounded-md p-1 bg-zinc-100 text-sm"
            >
              {tag.tags?.name}
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-sm text-zinc-500">タグは未設定です</span>
          )}
        </div>
      ) : (
        <TagEditor
          userId={userId}
          tags={tags}
          onSaved={(nextTags) => {
            setTags(dedupeByTagId(nextTags));
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
