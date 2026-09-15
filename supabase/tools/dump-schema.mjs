// 現在のスキーマを吸い出して、ファイルに書き出す。
//
// なぜこれがあるか:
//   ダッシュボードの SQL Editor に長いクエリを貼ると、環境によっては
//   実行されず意味不明なエラーになることがある（実際にハマった）。
//   psql があれば -f 一発で済むが、入っていないときの代替。
//   Node と npm はこのリポジトリで既に使っているので、追加で入れるものが少ない。
//
// 使い方:
//   1. Supabase ダッシュボード → Settings → Database → Connection string
//      の「URI」をコピーする（[YOUR-PASSWORD] の部分は実際のパスワードに差し替える）
//   2. 接続文字列を環境変数に入れて実行する
//
//      Windows (コマンドプロンプト):
//        set SUPABASE_DB_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres
//        npm run db:baseline
//
//      PowerShell:
//        $env:SUPABASE_DB_URL="postgresql://..."
//        npm run db:baseline
//
//   3. supabase/migrations/<日時>_baseline.sql ができる
//
// 出力先を変えたいときは第1引数で渡す:
//   node supabase/tools/dump-schema.mjs supabase/migrations/<日時>_baseline.sql
//
// 注意:
//   接続文字列にはDBのパスワードが入る。環境変数で渡すこと（引数に書くと
//   コマンド履歴に残る）。ファイルに保存する場合は .gitignore を確認すること。

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "SUPABASE_DB_URL が設定されていない。\n" +
      "Supabase → Settings → Database → Connection string (URI) をコピーして、\n" +
      "  set SUPABASE_DB_URL=postgresql://...\n" +
      "のように環境変数に入れてから実行すること。"
  );
  process.exit(1);
}

// 出力先。既定は supabase/migrations/<UTCの日時>_baseline.sql
function defaultOutPath() {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return resolve(here, "..", "migrations", `${stamp}_baseline.sql`);
}

const outPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : defaultOutPath();

const sql = readFileSync(resolve(here, "dump-schema.sql"), "utf8");

// Supabase は SSL 必須。証明書の検証まではしない（接続先は自分のプロジェクトで、
// ここで守りたいのは経路の暗号化のほう）。ローカルの検証用DBに向けるときは
// PGSSL=off を付ける。
const ssl = process.env.PGSSL === "off" ? false : { rejectUnauthorized: false };

const client = new pg.Client({ connectionString, ssl });

try {
  await client.connect();
  const result = await client.query(sql);
  const body = result.rows[0]?.schema_sql;

  if (!body) {
    console.error("結果が空だった。接続先のスキーマが空か、クエリが変わっている。");
    process.exit(1);
  }

  const header =
    "-- ベースライン。\n" +
    "-- supabase/tools/dump-schema.mjs が現在のDBから生成したもの。\n" +
    "-- これは【既に適用済み】の内容なので、db push で流してはいけない。\n" +
    "--   npx supabase@latest migration repair --status applied <このファイル名の数字部分>\n" +
    "-- で履歴にだけ記録すること。\n\n";

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, header + body + "\n", "utf8");

  console.log(`書き出した: ${outPath}`);
  console.log(`${(header + body).length} 文字 / ${body.split("\n").length} 行`);
} catch (error) {
  console.error("失敗した:", error.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
