# Auto-Tune Web

GitHub Pagesで動作する、リアルタイムの歌声音程補正（オートチューン）アプリケーションです。

## 機能
- マイク入力からのリアルタイム音程検出
- 指定した音階（クロマチック、Cメジャーなど）への自動補正
- 補正速度（Retune Speed）の調整
- 現在の周波数と音名の表示

## 使い方
1. ブラウザで `index.html` を開きます（GitHub Pagesにデプロイした場合はそのURL）。
2. 「開始」ボタンをクリックし、マイクの使用を許可します。
3. 歌うと、指定した音階に音程が補正されてスピーカーから出力されます。
4. 音階や補正速度を調整して、効果を確認してください。

## 技術スタック
- Web Audio API (ScriptProcessorNode, AnalyserNode)
- JavaScript (マイク入力処理、ピッチ検出、ピッチシフト)
- CSS (シンプルなUI)

## デプロイ方法
GitHubリポジトリにプッシュし、リポジトリの設定（Settings > Pages）からGitHub Pagesを有効にしてください。
