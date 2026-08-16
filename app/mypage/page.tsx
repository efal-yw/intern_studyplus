import SignOutButton from "../_components/SignOutButton";

export default function MyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-zinc-500">マイページ画面</p>
      <SignOutButton />
    </div>
  );
}
