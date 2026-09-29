"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { compressImage, TEXTBOOK_ICON_LIMITS } from "@/lib/image";
import TextbookIcon from "@/app/_components/TextbookIcon";
import {
  buildTextbookIconPath,
  insertIconRow,
  removeIconRow,
  removeTextbookIcon,
  SHARED_ICON_PREFIX,
  uploadTextbookIcon,
} from "@/lib/textbook-icon";

type IconOption = {
  id: string;
  name: string | null;
  icon_path: string | null;
};

/** モーダルを開いたときに選ばれた状態にしておくアイコン */
const DEFAULT_ICON_PATH = `${SHARED_ICON_PREFIX}TextbookIconBlue.webp`;

export default function AddTextbook({
  user,
  category,
}: {
  user: User;
  category: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  // 圧縮後のファイルを持つ。投稿フォームの ImageInput と違い FormData ではなく
  // JS から直接アップロードするので、隠し input に載せ替える必要はない
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // 既存アイコンから選んだ場合の icons.id。アップロードとは排他
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [icons, setIcons] = useState<IconOption[]>([]);
  const [isLoadingIcons, setIsLoadingIcons] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // useEffect の依存に入れるので、毎レンダリングで作り直さない
  const supabase = useMemo(() => createClient(), []);

  // 選べるアイコンは、プリセット (shared/) と自分がアップロードしたもの。
  // この絞り込みは icons の RLS に書いた前方一致と同じ判定を、クエリ側でやっている
  // (RLS の select は authenticated 全員に開いているので、絞るのはこちらの仕事)。
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setIsLoadingIcons(true);

    const load = async () => {
      const { data, error: iconsError } = await supabase
        .from("icons")
        .select("id, name, icon_path")
        .or(
          `icon_path.like.${SHARED_ICON_PREFIX}%,icon_path.like.${user.id}/%`,
        );

      if (cancelled) {
        return;
      }

      if (iconsError) {
        // 選べないだけで教材は作れるので、ここでは止めない
        console.error("icons fetch failed:", iconsError.message, iconsError);
      }

      // プリセットを先に並べる
      const isShared = (icon: IconOption) =>
        icon.icon_path?.startsWith(SHARED_ICON_PREFIX) ?? false;
      setIcons(
        (data ?? [])
          .slice()
          .sort((a, b) => Number(isShared(b)) - Number(isShared(a))),
      );
      // 既定の選択。id は取得するまで分からないので、パスで引いてここで入れる
      setSelectedIconId(
        data?.find((icon) => icon.icon_path === DEFAULT_ICON_PATH)?.id ?? null,
      );
      setIsLoadingIcons(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase, user.id]);

  function replacePreview(url: string | null) {
    setPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return url;
    });
  }

  function clearUpload() {
    setIconFile(null);
    replacePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function close() {
    clearUpload();
    setSelectedIconId(null);
    setInputText("");
    setError(null);
    setIsOpen(false);
  }

  /** 既存アイコンの選択。もう一度押すと解除する */
  function selectIcon(iconId: string) {
    clearUpload();
    setSelectedIconId((current) => (current === iconId ? null : iconId));
  }

  const handleIconChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError(null);

    // アップロードを選んだら既存アイコンの選択は解除する (排他)
    setSelectedIconId(null);

    if (!file) {
      setIconFile(null);
      replacePreview(null);
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, TEXTBOOK_ICON_LIMITS);
      setIconFile(compressed);
      replacePreview(URL.createObjectURL(compressed));
    } catch (compressError) {
      console.error(compressError);
      setIconFile(null);
      replacePreview(null);
      setError("画像を読み込めませんでした");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // 既存アイコンを選んだ場合はその id をそのまま使う (何も作らない)。
    // アップロードの場合だけ書き込みが3段になる。textbook.icon は icons.id を
    // 参照しているので、ファイル → icons → textbook の順でないと必ず
    // FK 違反 (23503) になる。失敗したら逆順に巻き戻す。
    let iconPath: string | null = null;
    let iconId: string | null = selectedIconId;

    if (iconFile) {
      try {
        iconPath = buildTextbookIconPath(user.id);
        await uploadTextbookIcon(supabase, iconPath, iconFile);
      } catch (uploadError) {
        console.error(uploadError);
        setError("画像を保存できませんでした");
        setIsSubmitting(false);
        return;
      }

      try {
        // 教材と同じ名前を付けておく。アイコン選択UIで何の絵か分かるように
        iconId = await insertIconRow(supabase, iconPath, inputText);
      } catch (iconRowError) {
        console.error(iconRowError);
        await removeTextbookIcon(supabase, iconPath);
        setError("画像を保存できませんでした");
        setIsSubmitting(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("textbook").insert({
      user_id: user.id,
      name: inputText,
      category: category,
      // 画像未選択なら icon は NULL のまま (アイコン無しの教材)
      icon: iconId,
    });

    if (insertError) {
      console.error(
        "AddTextbook insert error:",
        insertError.message,
        insertError,
      );
      // 教材が残らなかったので、作ったアイコンは孤児になる。逆順に片付ける
      if (iconId) {
        await removeIconRow(supabase, iconId);
      }
      if (iconPath) {
        await removeTextbookIcon(supabase, iconPath);
      }
      setError("教材を追加できませんでした");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    close();
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center"
      >
        <Image
          src="https://vssumrutrexcmlyvigqg.supabase.co/storage/v1/object/public/images/AddTextbook.webp"
          alt="addButton"
          width={64}
          height={64}
        />
        <p className="text-xs">教材を追加する</p>
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center"
          onClick={close}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col justify-center items-center gap-4 bg-white"
            >
              <label htmlFor="textbook-name">教材を追加</label>
              <input
                id="textbook-name"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                required
                placeholder="名前を入力"
              />
              <div className="flex flex-col items-start gap-2">
                <span>アイコン</span>
                {isLoadingIcons && <p>アイコンを読み込み中...</p>}
                <div className="grid grid-cols-4 gap-2">
                  {icons.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => selectIcon(icon.id)}
                      aria-pressed={selectedIconId === icon.id}
                      className={
                        selectedIconId === icon.id
                          ? "rounded border-2 border-blue-500"
                          : "rounded border-2 border-transparent"
                      }
                    >
                      <TextbookIcon
                        iconPath={icon.icon_path}
                        size={48}
                        alt={icon.name ?? ""}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <span>新しい画像</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconChange}
                />
              </label>
              {isCompressing && <p>画像を処理中...</p>}
              {preview && (
                // blob: URL は最適化サーバーから取得できないので unoptimized
                <Image
                  src={preview}
                  alt="アイコンのプレビュー"
                  width={64}
                  height={64}
                  unoptimized
                />
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="button" onClick={close}>
                戻る
              </button>
              <button type="submit" disabled={isCompressing || isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
