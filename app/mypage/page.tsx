import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../_components/SignOutButton";
import { ProfileHeader, ProfileSections } from "./_components/ProfileSections";
import type { FieldKey, Profile, Visibility } from "./_lib/profile-fields";
 
export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
 
  if (!user) redirect("/login");
 
  const [{ data: profile, error }, { data: visibilityRows }] = await Promise.all([
    supabase
      .from("users")
      .select(
        `id, name, avatar_url, status_message,
         following_count, follower_count,
         internship_status, internship_started_on, record_count,
         prefecture, high_school, tags,
         grade:grades ( label ),
         university:universities ( name, faculty )`,
      )
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("profile_field_visibility")
      .select("field_key, visibility")
      .eq("user_id", user.id),
  ]);
 
  if (error || !profile) {
    return <p className="p-6 text-sm text-red-600">プロフィールを取得できませんでした</p>;
  }
 
  const visibilityMap = Object.fromEntries(
    (visibilityRows ?? []).map((row) => [row.field_key, row.visibility]),
  ) as Partial<Record<FieldKey, Visibility>>;
 
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
 
  return (
    <div className="flex flex-1 flex-col gap-4 bg-zinc-50 p-6">
      <ProfileHeader profile={profile} today={today} />
      <ProfileSections profile={profile} visibilityMap={visibilityMap} />
      <SignOutButton />
    </div>
  );
}
