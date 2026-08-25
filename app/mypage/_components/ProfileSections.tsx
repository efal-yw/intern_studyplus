import Image from "next/image";
import Link from "next/link";
import {
  PRIMARY_STATS,
  STATUS_DOT_CLASS,
  STATUS_LABEL,
  SECTIONS,
  getField,
  visibilityOf,
  type FieldKey,
  type Profile,
  type Visibility,
} from "../_lib/profile-fields";
 
type VisibilityMap = Partial<Record<FieldKey, Visibility>>;
 
const EMPTY = "未設定";
 
function DefaultAvatar() {
  return (
    <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
      <rect width="80" height="80" fill="#e4e4e7" />
      <circle cx="40" cy="31" r="14" fill="#a1a1aa" />
      <path d="M40 50c-14 0-24 9-26 22h52c-2-13-12-22-26-22Z" fill="#a1a1aa" />
    </svg>
  );
}
 
function VisibilityIcon({ visibility }: { visibility: Visibility }) {
  const label =
    visibility === "public"
      ? "全体に公開"
      : visibility === "followers"
        ? "フォロワーに公開"
        : "自分のみ";
  return (
    <span aria-label={label} title={label} className="text-zinc-400">
      {visibility === "public" ? "◯" : visibility === "followers" ? "△" : "×"}
    </span>
  );
}
 
function FieldRow({
  fieldKey,
  profile,
  visibility,
}: {
  fieldKey: FieldKey;
  profile: Profile;
  visibility: Visibility;
}) {
  const field = getField(fieldKey);
  const value = field.value(profile);
 
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[.06] py-3 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-black">
        <VisibilityIcon visibility={visibility} />
        {field.label}
      </span>
      <span className={value ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}>
        {value ?? EMPTY}
      </span>
    </div>
  );
}
 
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-black">{title}</h2>
      {children}
    </section>
  );
}
 
export function ProfileSections({
  profile,
  visibilityMap,
}: {
  profile: Profile;
  visibilityMap: VisibilityMap;
}) {
  return (
    <div className="flex flex-col gap-4">
      {SECTIONS.map((section) => {
        if (section.kind === "fields") {
          return (
            <Card key={section.title} title={section.title}>
              {section.fields.map((key) => (
                <FieldRow
                  key={key}
                  fieldKey={key}
                  profile={profile}
                  visibility={visibilityOf(visibilityMap, key)}
                />
              ))}
            </Card>
          );
        }
 
        if (section.kind === "tags") {
          const tags = section.value(profile);
          return (
            <Card key={section.title} title={section.title}>
              {tags.length === 0 ? (
                <p className="text-sm text-zinc-400">{EMPTY}</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-black/[.05] px-3 py-1 text-sm text-zinc-700"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        }
 
        const text = section.value(profile);
        return (
          <Card key={section.title} title={section.title}>
            <p className={text ? "text-sm text-black" : "text-sm text-zinc-400"}>
              {text ?? EMPTY}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
 

function Stat({
  value,
  label,
  unit,
}: {
  value: number | null;
  label: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className="text-xl font-semibold tabular-nums text-black">
        {value === null ? "—" : value}
        {value !== null && unit && (
          <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>
        )}
      </span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}
 
export function ProfileHeader({
  profile,
  today,
}: {
  profile: Profile;
  today: string; 
}) {
  return (
    <header className="-mx-6 -mt-6 flex flex-col gap-3 bg-white px-6 pb-4 pt-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <DefaultAvatar />
          )}
        </div>
        <div className="flex flex-1">
          {PRIMARY_STATS.map((stat) => (
            <Stat
              key={stat.key}
              value={stat.value(profile, today)}
              label={stat.label}
              unit={stat.unit}
            />
          ))}
        </div>
      </div>
 
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">

          <p className="truncate text-base font-semibold text-black">
            {profile.name ?? "名前未設定"}
          </p>
          {profile.internship_status && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-600">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  STATUS_DOT_CLASS[profile.internship_status]
                }`}
              />
              {STATUS_LABEL[profile.internship_status]}
            </span>
          )}
        </div>

        <p
          className={`whitespace-pre-line text-sm leading-relaxed ${
            profile.status_message ? "text-zinc-600" : "text-zinc-400"
          }`}
        >
          {profile.status_message ?? "自己紹介を書く"}
        </p>
      </div>
 
      <div className="flex gap-4 text-sm text-zinc-500">
        <Link href={`/users/${profile.id}/followers`}>
          フォロワー {profile.follower_count ?? 0}
        </Link>
        <Link href={`/users/${profile.id}/following`}>
          フォロー中 {profile.following_count ?? 0}
        </Link>
      </div>
 
      <Link
        href="/mypage/edit"
        className="flex h-9 w-full items-center justify-center rounded border border-black/[.15] text-sm text-black"
      >
        プロフィールを編集
      </Link>
    </header>
  );
}
