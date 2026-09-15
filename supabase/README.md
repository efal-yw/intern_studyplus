# スキーマ管理の運用

DBのスキーマとRLSポリシーを、この `supabase/migrations/` でバージョン管理する。

**このプロジェクトは Docker を入れない方針。** ローカルDBは無く、Supabase Cloud の
リモートDBが唯一のDBになる。以下はすべてその前提で書いてある。

---

## 日々の作業

スキーマを変えるときの流れはこれだけ。**すべて Docker 不要・自分だけで完結する。**

```bash
# 1. 空のマイグレーションファイルを作る
npm run db:new -- add_studied_at_to_posts

# 2. できた supabase/migrations/<日時>_add_studied_at_to_posts.sql に SQL を書く
#      alter table public.posts add column studied_at timestamptz;
#      create index posts_studied_at_idx on public.posts (studied_at desc);

# 3. リモートDBに適用
npm run db:push

# 4. 型を再生成（スキーマを変えたら必ず）
npm run db:types

# 5. 型エラーが出ていないか確認
npm run typecheck
```

**テーブルを作る/変えるマイグレーションには、同じファイルの中に RLS ポリシーも書く。**
「あとで書く」は必ず忘れる（技術スタック選定書 落とし穴⑤）。

```sql
alter table public.foo enable row level security;

create policy "自分の行だけ読める" on public.foo
  for select to authenticated
  using (user_id = auth.uid());
```

---

## 使えるコマンド / 使えないコマンド

| コマンド | Docker | このプロジェクトで |
|---|---|---|
| `supabase login` / `link` | 不要 | 初回のみ |
| `migration new` (`npm run db:new`) | 不要 | **毎回** |
| `db push` (`npm run db:push`) | 不要 | **毎回** |
| `gen types --project-id <ref>` (`npm run db:types`) | 不要 | **毎回** |
| `migration repair` | 不要 | ズレを直すとき |
| `db:baseline` (このリポジトリの自作スクリプト) | 不要 | 現在のDBを吸い出す |
| `db pull` / `db diff` / `db dump` | **必要** | **使えない** |
| `supabase start` / `db reset` | **必要** | **使えない** |
| `gen types --linked` | **必要** | 使わない（`--project-id` を使う） |

「DBから吸い出す」系が Docker を要求するが、その役目は
[`tools/dump-schema.mjs`](tools/dump-schema.mjs)（`npm run db:baseline`）が肩代わりする。
これは Node と `pg` だけで動く。**Docker 無しでも運用は成立する。**

---

## ローカルDBが無い、ということ

**本番DBを直接触りながら開発している。** `db push` の失敗はそのまま本番に出る。
`db reset` で作り直す逃げ道も無い。だから書き方でカバーする。

1. **1ファイル＝1つの変更にする。** まとめて流して途中で落ちると、
   どこまで適用されたか分からない状態になる。
2. **冪等に書く。** 同じファイルを2回流しても壊れないようにする。
   途中で落ちたとき、直して流し直せる。
   （[書庫の `ff_rename_and_fix`](migrations_archive/20260913110000_ff_rename_and_fix.sql)
   がこの書き方の例）

   ```sql
   do $$
   begin
     if not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'posts' and column_name = 'studied_at'
     ) then
       alter table public.posts add column studied_at timestamptz;
     end if;
   end $$;
   ```

3. **破壊的な操作（`drop column` / `drop table` / `delete`）の直前にスナップショットを取る。**

   ```bash
   npm run db:baseline -- supabase/snapshots/before-drop.sql
   ```

   （スナップショットは `migrations/` の外に出すこと。中に置くと次の push で流れてしまう）
4. **検証用にもう1つ Supabase プロジェクトを作る**（無料枠に空きがあれば）。
   `migrations/` はベースラインから頭ごなしに流せる形になっているので、
   空のプロジェクトに `db push` すれば同じスキーマが再現できる。
   これが Docker 無しでの「ローカルDB」の代わりになる。

---

## `migrations/` の構成

```
supabase/
  migrations/          ← CLI が見るのはここだけ
    20260915130000_baseline.sql    現在のDBの姿まるごと
  migrations_archive/  ← ベースラインに畳み込み済み。実行されない
    20260912130012_...sql
    ...
```

ベースラインより前の差分は
[`migrations_archive/`](migrations_archive/README.md) に退避してある。
経緯を知りたいときだけ読む。**コピーして新しいマイグレーションにしないこと。**

---

## ベースラインを作る / 作り直す

`tools/dump-schema.mjs` が現在のDBから CREATE 文を生成する。

```powershell
# 1. 接続文字列を環境変数に入れる
#    Supabase ダッシュボード → Settings → Database → Connection string (URI)
$env:SUPABASE_DB_URL="postgresql://postgres.<ref>:<パスワード>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# 2. 吸い出す
npm run db:baseline -- supabase/migrations/20260915130000_baseline.sql
```

```bash
# 3. このSQLは「もう適用済み」なので、実行せず履歴にだけ記録する
#    <日時> はファイル名の数字の部分
npx supabase@latest migration repair --status applied 20260915130000
```

手順3を飛ばすと、次の `db push` で「そのテーブルはもうある」と言われて失敗する。

**パスワードはコマンド履歴に残る。** 環境変数で渡し、生成物に接続文字列が
混ざっていないか一度目視すること。

作り直したくなったら（ダッシュボードで手作業した分を取り込みたいときなど）、
同じ手順で新しいタイムスタンプのファイルを作り、古いベースラインを
`migrations_archive/` に移して `repair --status reverted <古い日時>` する。

---

## ダッシュボードで直接編集してしまったとき

ズレても壊れない。データも消えない。`db pull` は使えないので手で追いつく。

```bash
npm run db:new -- 何をしたか
# → ファイルに、ダッシュボードでやったのと同じ SQL を書く
npx supabase@latest migration repair --status applied <日時>
npm run db:types
```

**書いた SQL が本当に今のDBと一致しているか**は、`npm run db:baseline` で
スナップショットを取って該当箇所を読めば確認できる。

放置すると「リポジトリと本番、どっちが正しいか分からない」状態になるので、
**その日のうちに**追いつくこと。

---

## やってはいけないこと

- **`supabase db reset --linked`** — リモートDBを DROP して作り直す。本番が消える
- ズレたまま `db push` — 「その列はもうある」で失敗する。push の前に状態を合わせる
- `migrations_archive/` の SQL をコピーして新しいマイグレーションにする — 二重適用になる

---

## `dump-schema.sql` が拾わないもの

- Auth の設定（SMTP・プロバイダ・メールテンプレート）
- Storage のバケット設定（public/private・allowed_mime_types・file_size_limit）
- プロジェクト設定全般
- `auth` / `storage` スキーマの中身（Supabase の管理領域）

これらはダッシュボードが唯一の正になる。変更したら別途メモに残すこと。
検証用プロジェクトを作るときも、ここだけは手で揃える必要がある。
