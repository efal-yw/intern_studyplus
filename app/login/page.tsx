"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが違います。",
  email_not_confirmed:
    "メールアドレスの確認が済んでいません。届いたメールのリンクを開いてください。",
  user_already_exists:
    "このメールアドレスは登録済みです。",
  email_exists: "このメールアドレスは登録済みです。",
  weak_password: "パスワードは6文字以上にしてください。",
  over_email_send_rate_limit:
    "メールの送信上限に達しました。1分ほど待ってから再度お試しください。",
  over_request_rate_limit:
    "リクエストが多すぎます。しばらく待ってから再度お試しください",
  validation_failed: "入力内容を確認してください。",
};
 
function toJapaneseError(error: { code?: string; message: string }): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  const m = error.message;
  if (m.includes("Invalid login credentials"))
    return AUTH_ERROR_MESSAGES.invalid_credentials;
  if (m.includes("Email not confirmed"))
    return AUTH_ERROR_MESSAGES.email_not_confirmed;
  if (m.includes("already registered") || m.includes("already been registered"))
    return AUTH_ERROR_MESSAGES.user_already_exists;
  if (m.includes("Password should be"))
    return AUTH_ERROR_MESSAGES.weak_password;
  if (m.includes("rate limit"))
    return AUTH_ERROR_MESSAGES.over_request_rate_limit;
  return "うまく処理できませんでした。時間をおいて再度お試しください";
}

const FIELD_CLASS =
  "h-11 w-full rounded border border-black/[.15] px-3 text-base text-black outline-none focus:border-black/40";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(toJapaneseError(error)); 
        setIsLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setError(toJapaneseError(error));
      setIsLoading(false);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setSignupDone(true);
    setIsLoading(false);
  }

  if (signupDone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-black">確認メールを送信しました</p>
        <p className="text-sm text-zinc-500">
          {email} 宛のメールに記載されたリンクから登録を完了してください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-black">
          {mode === "login" ? "ログイン" : "新規登録"}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="text-sm text-zinc-600">
                ユーザー名
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" 
                autoCapitalize="none"
                className={FIELD_CLASS}
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-zinc-600">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-zinc-600">
              パスワード
            </label>
              {mode === "signup" && (
              <span className="text-xs text-zinc-500">6文字以上</span>
              )}
            </div>
            <div className="relative">
            <input
              id="password"
            　type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
                }
              className={`${FIELD_CLASS} pr-16`}
            />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "パスワードを隠す" : "パスワードを表示する"
                }
                className="absolute right-0 top-0 h-11 px-3 text-xs text-zinc-500"
              >
                {showPassword ? "隠す" : "表示"}
              </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded bg-black text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="mt-4 h-11 w-full text-center text-sm text-zinc-500 underline underline-offset-4"
        >
          {mode === "login" ? "アカウントを作成する" : "ログイン画面に戻る"}
        </button>
      </div>
    </div>
  );
}
