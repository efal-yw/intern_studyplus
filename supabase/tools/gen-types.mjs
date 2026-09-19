// Supabase の型定義を取り直して lib/database.types.ts に書き出す。
//
// なぜ npm script の `> lib/database.types.ts` を使わないか:
//   リダイレクトの出力エンコーディングは「どのシェルで叩いたか」で変わる。
//   Windows PowerShell 5.1 の `>` は UTF-16LE で書くため、型定義ファイルだけ
//   UTF-16 になっていた。こうなると
//     - ESLint が「File appears to be binary」でパースできない
//     - Git が NUL を見てバイナリ扱いし、差分が `Bin 13759 -> 32202 bytes` になる
//       (.gitattributes の `* text=auto eol=lf` も効かない)
//   という実害が出る。tsc は BOM 付き UTF-16 を読めてしまうので気付きにくい。
//
//   Node から書けばシェルに依存せず UTF-8(BOM無し)・LF に固定できる。
//
// 使い方: npm run db:types

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "..", "..", "lib", "database.types.ts");

const PROJECT_ID = "vssumrutrexcmlyvigqg";

// shell: true は Windows で npx(.cmd) を解決するために必要。
// 引数はこちらで固定した文字列しか渡さないので、シェル経由でも入力は増えない。
const result = spawnSync(
  "npx",
  [
    "supabase@latest",
    "gen",
    "types",
    "typescript",
    "--project-id",
    PROJECT_ID,
    "--schema",
    "public",
  ],
  { encoding: "utf8", shell: true, stdio: ["inherit", "pipe", "inherit"] },
);

if (result.error) {
  console.error("supabase gen types の起動に失敗:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`supabase gen types が exit ${result.status} で終了した`);
  process.exit(result.status ?? 1);
}

// 空のまま書き出すと型定義が消えて大量の型エラーになる。
// CLI がエラーを stderr に出しつつ exit 0 で返すケースの保険。
const types = result.stdout;
if (!types.includes("export type Database")) {
  console.error(
    "取得した内容に Database 型が含まれていない。書き出しを中止した。\n" +
      "--- 取得内容の先頭 ---\n" +
      types.slice(0, 500),
  );
  process.exit(1);
}

writeFileSync(outPath, types.replace(/\r\n/g, "\n"), { encoding: "utf8" });
console.log(`wrote ${outPath} (utf8, lf)`);
