"use client";
 
import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
 
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
 
export default function AvatarUpload({
  userId,
  initialUrl,
}: {
  userId: string;
  initialUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
 
    setError(null);
 
    if (!ACCEPTED.includes(file.type)) {
      setError("JPEG / PNG / WebP の画像を選んでください");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("画像は5MBまで");
      return;
    }
 
    setIsUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;
 
    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(path, file, { upsert: true, contentType: file.type });
 
    if (uploadError) {
      setError("アップロードに失敗しました");
      setIsUploading(false);
      return;
    }
 
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-images").getPublicUrl(path);
 
    const nextUrl = `${publicUrl}?v=${Date.now()}`;
 
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: nextUrl })
      .eq("id", userId);
 
    if (updateError) {
      setError("プロフィールの更新に失敗しました");
      setIsUploading(false);
      return;
    }
 
    setUrl(nextUrl);
    setIsUploading(false);
  }
 
  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-black/[.06]">
        {url && (
          <Image src={url} alt="" width={80} height={80} className="h-full w-full object-cover" />
        )}
      </div>
 
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="h-9 rounded border border-black/[.15] px-4 text-sm text-black disabled:opacity-50"
        >
          {isUploading ? "アップロード中" : "画像を変更"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
 
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
