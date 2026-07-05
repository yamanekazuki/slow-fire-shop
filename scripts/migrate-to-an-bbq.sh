#!/bin/bash
# an-bbq.jp への独自ドメイン移行スクリプト（GROWTH-10K-UU.md Phase 0-1）
# 前提: お名前.comでDNS設定済み（A×4=185.199.108-111.153 / www CNAME=yamanekazuki.github.io）
# 実行: bash scripts/migrate-to-an-bbq.sh   （実行前にDNS反映を確認すること）
set -euo pipefail
cd "$(dirname "$0")/.."

NEW="https://an-bbq.jp"
OLD="https://yamanekazuki.github.io/slow-fire-shop"

echo "▶ 1) DNS反映チェック"
ips=$(dig +short an-bbq.jp A | sort)
echo "$ips" | grep -q '185\.199\.108\.153' || { echo "❌ DNS未反映（A=185.199.108.153が引けない）。反映後に再実行"; exit 1; }
echo "  OK: $ips"

echo "▶ 2) CNAMEファイル作成（GitHub Pagesカスタムドメイン）"
printf 'an-bbq.jp\n' > CNAME

echo "▶ 3) 絶対URL一括置換（canonical/OGP/sitemap 等）"
grep -rl "$OLD" --include='*.html' --include='*.xml' --include='*.txt' . 2>/dev/null | grep -v node_modules | while IFS= read -r f; do
  sed -i '' "s|$OLD|$NEW|g" "$f"
done
# 置換漏れ確認
left=$(grep -rl "$OLD" --include='*.html' --include='*.xml' --include='*.txt' . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
echo "  残存参照: $left 件（0であること）"

echo "▶ 4) 自動ブログ生成スクリプト内のURL更新"
grep -rl "$OLD" scripts/*.mjs 2>/dev/null | while IFS= read -r f; do sed -i '' "s|$OLD|$NEW|g" "$f"; done || true

echo "▶ 5) コミット＆push（GitHub Pagesが自動再デプロイ）"
git add -A
git commit -m "migrate: 独自ドメイン an-bbq.jp へ移行（CNAME＋絶対URL一括置換）

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push

echo "✅ 完了。残タスク（Claudeが実施）:"
echo "  - gh api でPages設定確認＋HTTPS強制(enforce_https)"
echo "  - https://an-bbq.jp/ の200確認・旧URLの301確認"
echo "  - Search Console: 新プロパティ(an-bbq.jp ドメインプロパティ)＋sitemap送信＋アドレス変更"
