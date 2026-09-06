# スキーマ管理の運用

DBのスキーマとRLSポリシーを、この `supabase/migrations/` でバージョン管理する。

---

## 結論：日々の作業に `db pull` は要らない

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

`db pull` は「**DBを先にダッシュボードで手で触ってしまったときに、リポジトリを追いつかせる**」ためのコマンド。
マイグレーションファイル経由で変更している限り、一度も使わない。

**テーブルを作る/変えるマイグレーションには、同じファイルの中に RLS ポリシーも書く。**
「あとで書く」は必ず忘れる（技術スタック選定書 落とし穴⑤）。

```sql
alter table public.foo enable row level security;

create policy "自分の行だけ読める" on public.foo
  for select to authenticated
  using (user_id = auth.uid());
```

---

## Docker の要否

| コマンド | Docker | 使う場面 |
|---|---|---|
| `supabase login` / `link` | 不要 | 初回のみ |
| `migration new` | 不要 | **毎回** |
| `db push` | 不要 | **毎回** |
| `gen types --project-id <ref>` | 不要 | **毎回** |
| `migration repair` | 不要 | ズレを直すとき |
| `db pull` / `db diff` / `db dump` | **必要** | 追いつき用 |
| `gen types --linked` | **必要** | 使わない（`--project-id` を使う） |

**「DBから吸い出す」系だけが Docker を要求する。** 書き込む側は不要なので運用は成立する。

---

## 初回だけ：ベースラインを作る（自分でできる）

まだ `migrations/` が空の状態から、今のDBの姿を1本目のマイグレーションとして記録する手順。

```bash
# 1. 空のファイルを作る（<日時>_baseline.sql ができる）
npm run db:new -- baseline
```

```
2. supabase/tools/dump-schema.sql を開いて全文コピー
3. Supabase ダッシュボード → SQL Editor に貼って実行
4. 結果のセルの中身をコピーして、手順1で作ったファイルに貼り付けて保存
```

```bash
# 5. このSQLは「もう適用済み」なので、実行せず履歴にだけ記録する
#    <日時> は手順1でできたファイル名の数字の部分（例: 20260906121500）
npx supabase@latest migration repair --status applied <日時>
```

手順5を飛ばすと、次の `db push` で「そのテーブルはもうある」と言われて失敗する。

以降、`migrations/` に積んでいけば `db push` で回る。

---

## ダッシュボードで直接編集してしまったとき

ズレても壊れない。データも消えない。次のどちらかで追いつく。

**A. 同じ内容のマイグレーションを手で書いて、履歴にだけ記録する**（Docker不要）

```bash
npm run db:new -- 何をしたか
# → ファイルに、ダッシュボードでやったのと同じ SQL を書く
npx supabase@latest migration repair --status applied <日時>
npm run db:types
```

**B. `db pull` で自動的に差分を取る**（Docker が必要）

放置すると「リポジトリと本番、どっちが正しいか分からない」状態になるので、**その日のうちに**追いつくこと。

---

## Docker Desktop は入れたほうがいいか → いずれ入れたほうがいい

今すぐでなくてよいが、入れると2つ効く。

1. **`db pull` が使える** — 上の「追いつき」が手作業から1コマンドになる
2. **`supabase start` でローカルDBが立つ** — こちらのほうが重要。
   **今は本番DBを直接触りながら開発している状態**で、マイグレーションを試すのが怖い（失敗がそのまま本番に出る）。
   ローカルDBがあれば `db reset` で何度でも作り直して試せる。

技術スタック選定書でも「本番だけ Supabase Cloud、開発は Supabase CLI のローカル環境（Docker）」と決めていた。
順番としては、まずベースラインを作って前に進み、落ち着いたら Docker を入れる、で問題ない。

---

## やってはいけないこと

- **`supabase db reset --linked`** — リモートDBを DROP して作り直す。本番が消える
- ズレたまま `db push` — 「その列はもうある」で失敗する。push の前に状態を合わせる

---

## `dump-schema.sql` が拾わないもの

- Auth の設定（SMTP・プロバイダ・メールテンプレート）
- Storage のバケット設定
- プロジェクト設定全般
- `auth` / `storage` スキーマの中身（Supabase の管理領域）

これらはダッシュボードが唯一の正になる。変更したら別途メモに残すこと。
