# intern_studyplus

このリポジトリは Next.js でセットアップ済みです。

## 開発開始

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開くとアプリを確認できます。

## 本番ビルド

```bash
npm run build
```

## 認証(Supabase)

ログイン/サインアップはSupabase Authのメール+パスワード認証を使用しています(`/login`)。`.env.local`に`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`の設定が必要です。

### メール送信は現状Supabase組み込みのお試し用サービスを使用中

サインアップ確認メールなどの送信に、Supabase純正のテスト用メール機能をそのまま使っています。これは暫定運用で、以下の制限があります。

- 送信数の上限が**1時間あたり2通**
- 明示的に許可していない限り、**Supabaseの組織メンバー以外のアドレスには送信できない**
- 本番運用の稼働・配信についてSLA保証なし(ベストエフォート)

そのため、以下のタイミングで**カスタムSMTP(Resend, SendGrid, Postmarkなど)への切り替えが必須**になります。

- 本番リリースするとき
- 組織メンバー以外のメールアドレスでサインアップのテストをしたいとき
- 何度もサインアップのテストを繰り返して送信数上限に引っかかるようになったとき

設定箇所: Supabaseダッシュボード → Project Settings → Authentication → SMTP Settings
