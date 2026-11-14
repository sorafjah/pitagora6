#!/bin/sh
# dev/ の部品を1つにまとめて、リポジトリ直下の index.html を作る（dev/ の中で実行）
cd "$(dirname "$0")"
cat head.html sim.js levels.js ui.js > ../index.html
# ブラウザテスト用（CDNの代わりに node_modules を読む版）
sed -e 's#https://cdn.jsdelivr.net/npm/three@0.169.0/#/node_modules/three/#g' -e 's#https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/#/node_modules/cannon-es/#' -e '/fonts.googleapis/d' ../index.html > test/test.html
wc -c ../index.html
